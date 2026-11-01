import { describe, expect, it } from "vitest";
import { EMOJI_SET, ICON_IDS, ICONS, searchIcons, spriteMarkup, symbolMarkup } from "../src/schedule/icons";
import { isSingleEmoji } from "../src/schedule/model";
import { STARTERS } from "../src/schedule/starters";

const SPEC_IDS = ("backpack coat lunchbox calendar circle-time line-up wash-hands bathroom clean-up pack-up go-home bus reading writing math science social-studies art music pe library computer specialist " +
  "independent-work partner-work group-work quiet-time choice-time calm-corner snack lunch recess break assembly test field-trip guest drill celebration star").split(" ");

describe("icon set", () => {
  it("has exactly the 40 icons in the spec table", () => {
    expect(ICON_IDS).toHaveLength(40);
    expect([...ICON_IDS].sort()).toEqual([...SPEC_IDS].sort());
  });
  it("every id has a symbol, a plain name and stays under 1.5 KB", () => {
    const sprite = spriteMarkup();
    for (const i of ICONS) {
      expect(sprite).toContain(`<symbol id="si-${i.id}" viewBox="0 0 64 64">`);
      expect(i.name.length).toBeGreaterThan(1);
      expect(symbolMarkup(i).length).toBeLessThan(1500);
    }
    expect(new Set(ICON_IDS).size).toBe(40);
  });
  it("drawings are balanced and use only the style classes and CSS variables", () => {
    for (const i of ICONS) {
      expect(i.body).not.toMatch(/<(script|image|text|foreignObject)/i);
      expect(i.body).not.toMatch(/(fill|stroke)="/); // colors come from classes
      for (const m of i.body.matchAll(/class="([^"]+)"/g)) for (const c of m[1]!.split(" ")) expect(["si-f", "si-p", "si-k", "si-l", "si-n", "si-t"]).toContain(c);
      const opens = (i.body.match(/<(circle|rect|path|ellipse|g)\b/g) ?? []).length;
      const closed = (i.body.match(/\/>/g) ?? []).length + (i.body.match(/<\/g>/g) ?? []).length;
      expect(closed).toBeGreaterThanOrEqual(opens);
    }
  });
  it("search matches the icon name", () => {
    expect(searchIcons("read").map((i) => i.id)[0]).toBe("reading");
    expect(searchIcons("WASH").map((i) => i.id)).toContain("wash-hands");
    expect(searchIcons("zzzz")).toEqual([]);
    expect(searchIcons("")).toHaveLength(40);
  });
  it("every emoji in the picker is a single emoji, and the starters use only known icons", () => {
    for (const e of EMOJI_SET) expect(isSingleEmoji(e), e).toBe(true);
    for (const st of STARTERS) for (const c of st.make().activities) expect(ICON_IDS).toContain(c.icon);
  });
  it("starter schedules match the spec", () => {
    const names = (id: string) => STARTERS.find((s) => s.id === id)!.make().activities.map((c) => c.name);
    expect(names("elementary")).toEqual(["Arrival", "Circle time", "Reading", "Recess", "Math", "Lunch", "Specialist", "Pack up", "Go home"]);
    expect(names("morning")).toEqual(["Backpack", "Coat", "Wash hands", "Morning work"]);
    expect(names("firstthen")).toEqual(["Writing", "Break"]);
    expect(STARTERS.find((s) => s.id === "firstthen")!.make().mode).toBe("firstThen");
  });
});
