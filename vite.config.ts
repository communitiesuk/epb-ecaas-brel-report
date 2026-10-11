import { defineConfig } from "vite-plus";
import devServer from "@hono/vite-dev-server";
import { NodePackageImporter } from "sass";
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
  },
  build: {
    assetsInlineLimit: 100000,
  },
});
