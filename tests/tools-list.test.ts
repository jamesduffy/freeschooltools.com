import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tools, unlistedTools } from "../src/tools";

describe("tool list", () => {
  it("the IEP tool is not listed on the homepage but is still defined", () => {
    expect(tools.map((t) => t.id)).not.toContain("iep");
    expect(unlistedTools.map((t) => t.id)).toContain("iep");
  });
  it("every listed tool has a page", () => {
    for (const t of tools) expect(() => readFileSync(`.${t.path}index.html`), t.path).not.toThrow();
  });
  it("the unlisted IEP page asks search engines to skip it", () => {
    expect(readFileSync("./iep/index.html", "utf8")).toContain('name="robots" content="noindex"');
  });
});
