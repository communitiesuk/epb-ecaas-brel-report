// src/index.ts
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import nunjucks from "nunjucks";
import process from "node:process";
import govukStyles from "./sass/report.scss?inline";

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
  return c.html(reportHtml());
});

app.use(
  "/assets/*",
  serveStatic({
    root: "./node_modules/govuk-frontend/dist/govuk/assets",
    rewriteRequestPath: (path) => path.replace(/^\/assets/, ""),
  }),
);

app.post("/generate-pdf", async (c) => {
  const pdf = new Uint8Array(await generatePdfBuffer(reportHtml()));
  return c.body(pdf, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="report.pdf"',
  });
});

function reportHtml(): string {
  const nunjucksEnv = getNunjucks();

  return nunjucksEnv.render("report.njk", {
    css: govukStyles,
    title: "Sample Report",
    content: "This is a sample report generated using Puppeteer and Nunjucks.",
  });
}

function getNunjucks() {
  return nunjucks.configure(["node_modules/govuk-frontend/dist", "src/report"], {
    autoescape: true,
  });
}

export default app;
