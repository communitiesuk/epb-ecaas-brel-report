import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const targetTemplatesDir = path.join(distDir, "templates");

// 1. Create dist/templates folder
fs.mkdirSync(targetTemplatesDir, { recursive: true });

// 2. Copy govuk templates
const govukSrc = path.join(rootDir, "node_modules/govuk-frontend/dist/govuk");
if (fs.existsSync(govukSrc)) {
  fs.cpSync(govukSrc, path.join(targetTemplatesDir, "govuk"), { recursive: true });
  console.log("✓ Copied govuk templates");
}

// 3. Copy report templates
const reportSrc = path.join(rootDir, "src/report");
if (fs.existsSync(reportSrc)) {
  fs.cpSync(reportSrc, path.join(targetTemplatesDir, "report"), { recursive: true });
  console.log("✓ Copied report templates");
}

// 4. Tell Lambda that files in dist are ES Modules
fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify({ type: "module" }, null, 2));
console.log("✓ Created dist/package.json with type: module");

// 5. Create deployment zip
console.log("Packaging deployment.zip...");
execSync("zip -r ../deployment.zip ./*", { cwd: distDir, stdio: "inherit" });
console.log("✓ deployment.zip created ready for Lambda!");
