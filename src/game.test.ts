import { describe, expect, it, vi } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import { FIRE_COOLDOWN, LEVELS, SEEDED_CORES } from "./constants";
import { game, type VoluteState } from "./game";

const particle = {
  dimensions: 2,
  field: { width: 160, height: 160 },
  durationMs: 500,
  fps: 60,
  loop: false,
  emitters: [],
};
async function setup() {
  const init = {
    input: { register: vi.fn(), layout: () => null },
    audio: { load: vi.fn(async () => undefined), define: vi.fn() },
    assets: {
      loadImage: vi.fn(async () => ({ width: 32, height: 32 }) as ImageBitmap),
      loadAudio: vi.fn(),
      load: vi.fn(async () => new Blob([JSON.stringify(particle)])),
      resolve: (path: string) => `assets/${path}`,
    },
    diagnostics: { register: vi.fn() },
    events: { on: vi.fn() },
    viewport: vi.fn(),
  } as unknown as InitApi<VoluteState>;
  return game.initialize(init);
}
function updateApi() {
  const looping = new Set<string>();
  return {
    input: {
      value: () => 0,
      pressed: () => false,
      pointer: () => ({
        x: 420,
        y: 330,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerPressed: () => false,
      pointerSamples: () => [],
    },
    audio: {
      play: vi.fn(),
      loop: (cue: string) => looping.add(cue),
      stop: (cue: string) => looping.delete(cue),
      looping: (cue: string) => looping.has(cue),
      setMuted: vi.fn(),
      muted: () => false,
    },
  } as unknown as UpdateApi;
}

describe("Volute simulation", () => {
  it("opens a level with the specified seed count and quota", async () => {
    const [title, debug] = await setup();
    const state = debug.startLevel(title, 1);
    const shot = debug.snapshot(state);
    expect(shot.screen).toBe("playing");
    expect(shot.train).toHaveLength(SEEDED_CORES);
    expect(shot.quotaRemaining).toBe(LEVELS[0].quota - SEEDED_CORES);
    expect(shot.train[0].s).toBe(308);
    expect(shot.train[shot.train.length - 1]?.s).toBe(0);
  });
  it("normalizes aim and debug fire always launches", async () => {
    const [title, debug] = await setup();
    let state = debug.startLevel(title, 1);
    state = debug.setAim(state, -90);
    state = debug.setLoaded(state, "garnet");
    state = debug.fire(state);
    expect(state.aim).toBe(270);
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0].charge).toBe("garnet");
    expect(state.fireCooldown).toBe(FIRE_COOLDOWN);
  });
  it("extracts an inserted run and pays its score", async () => {
    const [title, debug] = await setup();
    let state = debug.startLevel(title, 1);
    state = debug.setEmission(state, false);
    state = debug.setFeed(state, false);
    state = debug.poseTrain(state, [
      [130, "halide", null],
      [102, "halide", null],
    ]);
    state = {
      ...state,
      projectiles: [{ charge: "halide", x: 170, y: 50, angle: 270 }],
    };
    const next = game.update(state, updateApi(), 1 / 60);
    expect(next.cores).toHaveLength(0);
    expect(next.score).toBe(30);
    expect(next.chainStep).toBe(1);
  });
  it("rejects out-of-domain debug poses", async () => {
    const [title, debug] = await setup();
    expect(() => debug.setLevel(title, 6)).toThrow();
    expect(() => debug.setCells(title, -1)).toThrow();
    expect(() => debug.setPressure(title, 101)).toThrow();
  });
});
