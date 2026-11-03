import { defineConfig } from "vite-plus";
import devServer from "@hono/vite-dev-server";
import { NodePackageImporter } from "sass";
import { builtinModules } from "node:module";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  plugins: [
    devServer({
      entry: "src/index.ts",
    }),
    {
      name: "force-inline-dev-fonts",
      apply: "serve",
      transform(code, id) {
        if (/\.(woff2?|ttf|eot|otf)(\?.*)?\$/.test(id)) {
          const filePath = id.split("?")[0];
          try {
            const buffer = fs.readFileSync(filePath);
            const ext = path.extname(filePath).replace(".", "");
            const base64 = buffer.toString("base64");

            // Return it as a default exported data URI string
            return `export default "data:font/${ext};base64,${base64}"`;
          } catch (e) {
            console.error(`Failed to inline font: ${filePath}`, e);
          }
        }
      },
    },
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
        importers: [new NodePackageImporter()],
      },
    },
    lightningcss: {
      errorRecovery: true,
    },
  },
  build: {
    assetsInlineLimit: 100000,
    target: "node22",
    ssr: true,
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: {
      external: [
        "@sparticuz/chromium",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        entryFileNames: "index.mjs",
        format: "es",
        exports: "named",
      },
    },
  },
  ssr: {
    noExternal: ["hono", "@hono/aws-lambda", "@hono/node-server", "nunjucks", "puppeteer-core"],
  },
});
