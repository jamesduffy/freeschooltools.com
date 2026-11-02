// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ART } from "../src/aquarium/art";
import { SPECIES } from "../src/aquarium/config";
import { FISH, MAX_FISH, TOTAL_FISH, Tank } from "../src/aquarium/tank";

const dir = join(import.meta.dirname, "../src/aquarium");
const files = readdirSync(dir).filter((f) => /\.(ts|css)$/.test(f));
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const code = files.map((f) => ({ f, src: stripComments(readFileSync(join(dir, f), "utf8")) }));

describe("privacy: the source has no recording or network code", () => {
  const banned = ["MediaRecorder", "fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon", "EventSource", "RTCPeerConnection", "AudioWorklet", "ScriptProcessor", "createMediaStreamDestination", "createBufferSource", "decodeAudioData", "new Audio(", "Worker(", "indexedDB", "sessionStorage", "console."];
  for (const word of banned) {
    it(`does not contain ${word}`, () => {
      const hits = code.filter(({ src }) => src.includes(word)).map((c) => c.f);
      expect(hits).toEqual([]);
    });
  }
  it("never connects anything to an audio output", () => {
    for (const { f, src } of code) {
      expect(src, f).not.toMatch(/\.destination/);
      expect(src, f).not.toMatch(/connect\(\s*[\w.]*destination/i);
    }
    // the only connect() call in the app is source -> analyser
    const connects = code.flatMap(({ src }) => src.match(/\.connect\([^)]*\)/g) ?? []);
    expect(connects).toEqual([".connect(analyser)"]);
  });
  it("uses getUserMedia only in mic.ts, with no echo cancellation, noise suppression or auto gain", () => {
    const users = code.filter(({ src }) => src.includes("getUserMedia")).map((c) => c.f);
    expect(users).toEqual(["mic.ts"]);
    const mic = readFileSync(join(dir, "mic.ts"), "utf8");
    expect(mic).toMatch(/echoCancellation: false, noiseSuppression: false, autoGainControl: false/);
  });
  it("does not write loudness to storage or logs", () => {
    for (const { f, src } of code) if (f !== "storage.ts" && f !== "main.ts") expect(src, f).not.toMatch(/localStorage|setItem/);
    const main = code.find((c) => c.f === "main.ts")!.src;
    expect(main).not.toMatch(/readDb|loudness/i);
  });
  it("loads no outside resources", () => {
    for (const { f, src } of code) expect(src, f).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    const html = readFileSync(join(dir, "../../aquarium/index.html"), "utf8");
    expect(html).not.toMatch(/https?:\/\//);
  });
});

describe("art and tank", () => {
  it("has art for every species, each under 4 KB", () => {
    expect(SPECIES).toHaveLength(31);
    for (const sp of SPECIES) expect(ART[sp.id]!.body.length, sp.id).toBeLessThan(4096);
  });
  it("keeps the fish count under 30", () => {
    expect(MAX_FISH).toBeLessThan(30);
    const tank = new Tank();
    tank.show(SPECIES.length, true);
    expect(tank.fishCount).toBe(TOTAL_FISH);
    expect(Object.keys(FISH)).toHaveLength(SPECIES.length);
  });
  it("shows only the species that have arrived and can be cleared", () => {
    const tank = new Tank();
    tank.show(1, false);
    expect(tank.fishCount).toBe(6); // a school of minnows
    tank.show(2, false);
    expect(tank.fishCount).toBe(7); // plus a guppy
    tank.clear();
    expect(tank.fishCount).toBe(0);
  });
});
