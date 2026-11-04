import { Hono } from "hono";
import nunjucksModule from "nunjucks";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import { registerFilters } from "./utils/nunjucks-filters";
import process from "node:process";
import fs from "node:fs";
import { handle } from "@hono/aws-lambda";
import path from "node:path";
import govukStyles from "./sass/report.scss?inline";
import mockBrelData from "./fixtures/mock-brel-data.json";
import { fileURLToPath } from "node:url";

const nunjucks =
  (nunjucksModule as unknown as { default?: typeof nunjucksModule }).default ?? nunjucksModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getBrowser() {
  const isLocal = process.env.NODE_ENV === "development" || !process.env.AWS_EXECUTION_ENV;

  if (isLocal) {
    const moduleName = "puppeteer";
    const puppeteerModule = await import(/* @vite-ignore */ moduleName);
    const puppeteer = puppeteerModule.default ?? puppeteerModule;

    return await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
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

app.post("/generate-pdf", async (c) => {
  try {
    let payload = mockBrelData;

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

function getNunjucks() {
  const candidatePaths = [
    path.join(__dirname, "templates"),
    path.join(process.cwd(), "templates"),
    path.join(process.cwd(), "src/templates"),
    path.join(process.cwd(), "src"),
  ].filter((p) => fs.existsSync(p));

  const govukPath = path.join(process.cwd(), "node_modules/govuk-frontend/dist");
  if (fs.existsSync(govukPath)) {
    candidatePaths.push(govukPath);
  }

  const env = nunjucks.configure(candidatePaths, {
    autoescape: true,
    noCache: process.env.NODE_ENV === "development",
  });

  registerFilters(env);
  return env;
}

export function renderReportHtml(data: Record<string, unknown> = mockBrelData): string {
  const nunjucksEnv = getNunjucks();

  return nunjucksEnv.render("report/report.njk", {
    css: govukStyles,
    ...data,
  });
}

// Needed by AWS Lambda
export const handler = handle(app);

// Needed by local Vite dev server
export default app;
