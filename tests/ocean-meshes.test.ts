import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { barrelSponge, branchCoral, brainCoral, coverMat, fanCoral, fishMesh, jellyMesh, mantaMesh, rockMesh, STRIDE, terrainMesh, tubeSponge, wreckMesh } from "../src/ocean/meshes";
import * as S from "../src/ocean/shaders";

describe("ocean meshes", () => {
  const all = {
    rock: rockMesh(1), branch: branchCoral(1, 0), branch2: branchCoral(2, 2), fan: fanCoral(), brain: brainCoral(), barrel: barrelSponge(), tube: tubeSponge(), mat: coverMat(),
    fish: fishMesh(false), slender: fishMesh(true), manta: mantaMesh(), jelly: jellyMesh(), wreck: wreckMesh(),
  };
  for (const [name, m] of Object.entries(all)) {
    it(`${name} is a sound mesh`, () => {
      expect(m.verts).toBeGreaterThan(20);
      expect(m.n % 3).toBe(0);
      expect(m.vb.byteLength).toBe(m.verts * STRIDE);
      const f = new Float32Array(m.vb);
      for (let i = 0; i < m.verts; i++) {
        const nx = f[i * 7 + 3]!, ny = f[i * 7 + 4]!, nz = f[i * 7 + 5]!;
        expect(Number.isFinite(f[i * 7]! + f[i * 7 + 1]! + f[i * 7 + 2]!)).toBe(true);
        expect(Math.abs(Math.hypot(nx, ny, nz) - 1)).toBeLessThan(0.01);
      }
      for (const idx of m.ib) expect(idx).toBeLessThan(m.verts);
    });
  }
  it("keeps instanced meshes small enough to draw hundreds of times", () => {
    expect(all.rock.n / 3).toBeLessThan(2000);
    expect(all.branch.n / 3).toBeLessThan(3000);
    expect(all.fish.n / 3).toBeLessThan(900);
    expect(all.slender.n / 3).toBeLessThan(900);
  });
  it("builds the sea floor at a sane size", () => {
    const t = terrainMesh();
    expect(t.verts).toBeGreaterThan(50000);
    expect(t.verts).toBeLessThan(65536); // so 16-bit indices are enough
  });
});

describe("ocean shaders", () => {
  it("are all GLSL ES 3.00 with a main function and no outside includes", () => {
    for (const [name, src] of Object.entries(S)) {
      expect(src, name).toMatch(/^#version 300 es/);
      expect(src, name).toContain("void main()");
      expect(src, name).not.toMatch(/#include|https?:\/\//);
    }
  });
});

describe("privacy: the ocean has no recording or network code", () => {
  const dir = join(import.meta.dirname, "../src/ocean");
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const files = readdirSync(dir).filter((f) => /\.(ts|css)$/.test(f)).map((f) => ({ f, src: strip(readFileSync(join(dir, f), "utf8")) }));
  for (const word of ["getUserMedia", "MediaRecorder", "fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon", "EventSource", "RTCPeerConnection", "AudioWorklet", "decodeAudioData", "new Audio(", "Worker(", "indexedDB", "sessionStorage", "console."]) {
    it(`does not contain ${word}`, () => { expect(files.filter(({ src }) => src.includes(word)).map((x) => x.f)).toEqual([]); });
  }
  it("stores only the detail setting", () => {
    const uses = files.filter(({ src }) => /localStorage/.test(src)).map((x) => x.f);
    expect(uses).toEqual(["main.ts"]);
  });
  it("loads nothing from outside, apart from one credit link in the About text", () => {
    for (const { f, src } of files) {
      const urls = src.match(/https?:\/\/[^"'`\s)]+/g) ?? [];
      expect(urls.filter((u) => !u.startsWith("https://github.com/Noniv/abyssal-garden")), f).toEqual([]);
    }
    expect(readFileSync(join(import.meta.dirname, "../ocean/index.html"), "utf8")).not.toMatch(/https?:\/\//);
  });
});
