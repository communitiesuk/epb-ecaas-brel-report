// src/index.ts
import { Hono } from "hono";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import process from "node:process";

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
  return c.json({ message: "Hello from Hono with Vite+!" });
});

app.post("/generate-pdf", async (c) => {
  const pdf = new Uint8Array(
    await generatePdfBuffer(
      "<h1>Hello, World!</h1><p>This is a PDF generated from HTML content.</p>",
    ),
  );
  return c.body(pdf, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="report.pdf"',
  });
});

export default app;
