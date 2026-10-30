// src/index.ts
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import nunjucks from "nunjucks";
import { registerFilters } from "./utils/nunjucks-filters";
import process from "node:process";
import govukStyles from "./sass/report.scss?inline";
import mockBrelData from "./fixtures/mock-brel-data.json";

export async function getBrowser() {
  const isLocal = process.env.NODE_ENV === "development" || !process.env.AWS_EXECUTION_ENV;

  if (isLocal) {
    const puppeteer = await import("puppeteer");
    return await puppeteer.launch({
      headless: true,
    });
  } else {
    const viewport = {
      deviceScaleFactor: 1,
      hasTouch: false,
      height: 1080,
      isLandscape: true,
      isMobile: false,
      width: 1920,
    };

    return await puppeteerCore.launch({
      args: await puppeteerCore.defaultArgs({ args: chromium.args, headless: "shell" }),
      headless: true,
      executablePath: await chromium.executablePath(),
      defaultViewport: viewport,
    });
  }
}

// Core logic reusable by local scripts and Lambda
export async function generatePdfBuffer(htmlContent: string) {
  let browser = null;
  try {
    browser = await getBrowser();

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
    });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

const app = new Hono();

app.get("/", (c) => {
  return c.html(renderReportHtml(mockBrelData));
});

app.use(
  "/assets/*",
  serveStatic({
    root: "./node_modules/govuk-frontend/dist/govuk/assets",
    rewriteRequestPath: (path) => path.replace(/^\/assets/, ""),
  }),
);

app.post("/generate-pdf", async (c) => {
  try {
    let payload = mockBrelData;

    // If the caller (e.g. FHS lambda) sends JSON, use it; otherwise fall back to mock data
    const contentType = c.req.header("content-type");
    if (contentType && contentType.includes("application/json")) {
      const body = await c.req.json();
      if (body && Object.keys(body).length > 0) {
        payload = body;
      }
    }

    const pdf = new Uint8Array(await generatePdfBuffer(renderReportHtml(payload)));
    return c.body(pdf, 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="report.pdf"',
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return c.json({ error: "Failed to generate PDF", details: (error as Error).message }, 500);
  }
});

export function renderReportHtml(data: Record<string, unknown> = mockBrelData): string {
  const nunjucksEnv = getNunjucks();

  return nunjucksEnv.render("report.njk", {
    css: govukStyles,
    ...data,
  });
}

function getNunjucks() {
  const env = nunjucks.configure(["node_modules/govuk-frontend/dist", "src/report"], {
    autoescape: true,
  });

  registerFilters(env);

  return env;
}

export default app;
