import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

const CSP =
  "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'";

function localDate(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Adds the CSP meta tag to every page (production build only) and refuses to
 *  build while the suggestion form link is still a placeholder. */
function sitePolicy(): Plugin {
  return {
    name: "site-policy",
    apply: "build",
    buildStart() {
      const src = readFileSync(resolve(import.meta.dirname, "src/tools.ts"), "utf8");
      if (src.includes("REPLACE_ME") && !process.env.ALLOW_PLACEHOLDER) {
        this.error(
          "src/tools.ts still contains REPLACE_ME. Set SUGGESTION_FORM_URL to the real form link before building for production.",
        );
      }
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const meta = `<meta http-equiv="Content-Security-Policy" content="${CSP}">`;
        return html.replace("<head>", `<head>\n    ${meta}`);
      },
    },
  };
}

/** Every top-level folder with an index.html is a tool entry page (iep/, timer/, garden/ ...). */
function entries(): Record<string, string> {
  const root = import.meta.dirname;
  const out: Record<string, string> = { main: resolve(root, "index.html"), notFound: resolve(root, "404.html") };
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (d.isDirectory() && !["node_modules", "dist", "src", "public", "tests"].includes(d.name) && !d.name.startsWith(".") && existsSync(resolve(root, d.name, "index.html"))) {
      out[d.name] = resolve(root, d.name, "index.html");
    }
  }
  return out;
}

export default defineConfig({
  base: "/",
  define: { __BUILD_DATE__: JSON.stringify(localDate()) },
  plugins: [sitePolicy()],
  build: {
    target: "es2022",
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    rollupOptions: {
      input: entries(),
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
