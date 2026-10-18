import { ParticleCanvasPlayer } from "@clockwyrks/particle-runtime/canvas";
import type { ParticleSystem } from "@clockwyrks/particle-runtime";
import type { Game, InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import {
  ACTIONS,
  AIM_START,
  AIM_TURN_RATE,
  BACKFLOW_SPEED,
  BINDINGS,
  BORE_RADIUS,
  CATCHUP_SPEED,
  CELLS,
  CHAIN_RESET,
  CHANNEL,
  CHARGE_IDS,
  CHOKE_FEED_MULTIPLIER,
  CLEAR_SCORE,
  CORE_RADIUS,
  CUES,
  DANGER_S,
  EXTRACT_CUES,
  FIELD_H,
  FIELD_W,
  FIRE_COOLDOWN,
  INJECTOR_X,
  INJECTOR_Y,
  INTERLUDE,
  LEVEL_COUNT,
  LEVELS,
  MACHINERY_DURATIONS,
  MACHINERY_KINDS,
  MARK_INTERVAL,
  MIN_RUN,
  PATH_LENGTH,
  PRESSURE_BLEED,
  PRESSURE_DROP_PER_CORE,
  PRESSURE_FREE,
  PRESSURE_MAX,
  PRESSURE_RISE_PER_CORE,
  PROJECTILE_SPEED,
  RECOIL,
  RECOIL_HOLD,
  SCORE_PER_CORE,
  SCREENS,
  SEEDED_CORES,
  SEEDED_HEAD_S,
  SPACING,
  STRIKE_DISTANCE,
  TICK_DT,
  TITLE_TEXT,
  VOLUTE_DEBUG_VERSION,
} from "./constants";
import type { ChargeId, MachineryKind, ScreenName } from "./constants";

export type { ChargeId, MachineryKind, ScreenName };

export interface CoreState {
  readonly charge: ChargeId;
  readonly s: number;
  readonly mark: MachineryKind | null;
}
export interface SegmentState {
  readonly count: number;
  readonly hold: number;
}
export interface ProjectileState {
  readonly charge: ChargeId;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}
export interface MachineryState {
  readonly kind: MachineryKind;
  readonly remaining: number;
}
export interface VoluteState {
  readonly screen: ScreenName;
  readonly score: number;
  readonly level: number;
  readonly cells: number;
  readonly quotaRemaining: number;
  readonly pressure: number;
  readonly chainStep: number;
  readonly chainTimer: number;
  readonly machinery: MachineryState | null;
  readonly cores: readonly CoreState[];
  readonly segments: readonly SegmentState[];
  readonly projectiles: readonly ProjectileState[];
  readonly loaded: ChargeId | null;
  readonly queued: ChargeId | null;
  readonly aim: number;
  readonly fireCooldown: number;
  readonly interlude: number;
  readonly simTime: number;
  readonly accumulator: number;
  readonly emission: boolean;
  readonly feed: boolean;
  readonly nextEmitted: ChargeId | null;
  readonly muted: boolean;
}

type TrainPose = readonly [number, ChargeId, MachineryKind | null][];
type Snapshot = ReturnType<typeof snapshot>;
export interface VoluteDebugApi {
  readonly version: number;
  reset(state: DeepReadonly<VoluteState>): VoluteState;
  reconcile(state: DeepReadonly<VoluteState>): VoluteState;
  snapshot(state: DeepReadonly<VoluteState>): Snapshot;
  setScreen(state: DeepReadonly<VoluteState>, name: ScreenName): VoluteState;
  setLevel(state: DeepReadonly<VoluteState>, level: number): VoluteState;
  setScore(state: DeepReadonly<VoluteState>, n: number): VoluteState;
  setCells(state: DeepReadonly<VoluteState>, n: number): VoluteState;
  setChainStep(state: DeepReadonly<VoluteState>, k: number): VoluteState;
  startLevel(state: DeepReadonly<VoluteState>, level: number): VoluteState;
  poseTrain(state: DeepReadonly<VoluteState>, cores: TrainPose): VoluteState;
  clearTrain(state: DeepReadonly<VoluteState>): VoluteState;
  setLoaded(state: DeepReadonly<VoluteState>, charge: ChargeId): VoluteState;
  setQueued(state: DeepReadonly<VoluteState>, charge: ChargeId): VoluteState;
  setAim(state: DeepReadonly<VoluteState>, angleDegrees: number): VoluteState;
  fire(state: DeepReadonly<VoluteState>): VoluteState;
  setPressure(state: DeepReadonly<VoluteState>, value: number): VoluteState;
  setQuotaRemaining(state: DeepReadonly<VoluteState>, n: number): VoluteState;
  setEmission(state: DeepReadonly<VoluteState>, enabled: boolean): VoluteState;
  setNextEmitted(
    state: DeepReadonly<VoluteState>,
    charge: ChargeId | null,
  ): VoluteState;
  setFeed(state: DeepReadonly<VoluteState>, enabled: boolean): VoluteState;
  grantMachinery(
    state: DeepReadonly<VoluteState>,
    kind: Exclude<MachineryKind, "bore">,
  ): VoluteState;
  pause(state: DeepReadonly<VoluteState>): VoluteState;
  resume(state: DeepReadonly<VoluteState>): VoluteState;
}

export const BACKGROUND = "#081116";
const CHARGE_COLORS: Record<ChargeId, string> = {
  halide: "#39cfe0",
  sulfur: "#f2b43a",
  cobalt: "#5084ed",
  garnet: "#df426c",
  olivine: "#78c857",
};
const arcStarts = CHANNEL.map((_, i) => {
  let sum = 0;
  for (let j = 0; j < i; j++)
    sum += Math.hypot(
      CHANNEL[j + 1].x - CHANNEL[j].x,
      CHANNEL[j + 1].y - CHANNEL[j].y,
    );
  return sum;
});

interface Assets {
  cores: Record<ChargeId, ImageBitmap>;
  marks: Record<MachineryKind, ImageBitmap>;
  base: ImageBitmap;
  barrel: ImageBitmap;
  maw: ImageBitmap;
  plate: ImageBitmap;
  cell: ImageBitmap;
  pressure: ImageBitmap;
  recoil: ImageBitmap[];
  swallow: ImageBitmap[];
  flash: ImageBitmap[];
  effects: Record<string, ParticleSystem>;
}
let assets: Assets | null = null;
let effectPlayer: ParticleCanvasPlayer | null = null;
let effectContext: CanvasRenderingContext2D | null = null;
let lastFlashKey = "";

const norm = (angle: number) => ((angle % 360) + 360) % 360;
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const randomCharge = (level: number, pool?: readonly CoreState[]): ChargeId => {
  const options =
    pool && pool.length
      ? [...new Set(pool.map((c) => c.charge))]
      : LEVELS[level - 1].charges;
  return options[Math.floor(Math.random() * options.length)];
};
function pointAt(s: number): { x: number; y: number; fx: number; fy: number } {
  const value = clamp(s, 0, PATH_LENGTH);
  let leg = CHANNEL.length - 2;
  for (let i = 0; i < CHANNEL.length - 1; i++)
    if (arcStarts[i] <= value) leg = i;
  const a = CHANNEL[leg];
  const b = CHANNEL[leg + 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const fx = (b.x - a.x) / len;
  const fy = (b.y - a.y) / len;
  return {
    x: a.x + fx * (value - arcStarts[leg]),
    y: a.y + fy * (value - arcStarts[leg]),
    fx,
    fy,
  };
}
function deriveSegments(
  cores: readonly CoreState[],
  old: readonly SegmentState[] = [],
): SegmentState[] {
  if (!cores.length) return [];
  const out: SegmentState[] = [];
  let count = 1;
  for (let i = 1; i < cores.length; i++) {
    if (Math.abs(cores[i - 1].s - cores[i].s - SPACING) < 1e-5) count++;
    else {
      out.push({ count, hold: old[out.length]?.hold ?? 0 });
      count = 1;
    }
  }
  out.push({ count, hold: old[out.length]?.hold ?? 0 });
  return out;
}
const effectiveFeed = (s: DeepReadonly<VoluteState>) =>
  LEVELS[s.level - 1].feedSpeed *
  (1 + s.pressure / 100) *
  (s.machinery?.kind === "choke" ? CHOKE_FEED_MULTIPLIER : 1);
const danger = (s: DeepReadonly<VoluteState>) =>
  s.screen === "playing" && !!s.cores[0] && s.cores[0].s >= DANGER_S;

function titleState(emission = true, feed = true, muted = false): VoluteState {
  return {
    screen: "title",
    score: 0,
    level: 1,
    cells: CELLS,
    quotaRemaining: LEVELS[0].quota,
    pressure: 0,
    chainStep: 1,
    chainTimer: 0,
    machinery: null,
    cores: [],
    segments: [],
    projectiles: [],
    loaded: null,
    queued: null,
    aim: AIM_START,
    fireCooldown: 0,
    interlude: 0,
    simTime: 0,
    accumulator: 0,
    emission,
    feed,
    nextEmitted: null,
    muted,
  };
}
function openLevel(
  state: DeepReadonly<VoluteState>,
  level: number,
): VoluteState {
  requireWhole(level, 1, LEVEL_COUNT, "level");
  const cores: CoreState[] = [];
  for (let i = 0; i < SEEDED_CORES; i++)
    cores.push({
      charge: randomCharge(level),
      s: SEEDED_HEAD_S - i * SPACING,
      mark:
        (i + 1) % MARK_INTERVAL === 0
          ? MACHINERY_KINDS[Math.floor(i / MARK_INTERVAL) % 4]
          : null,
    });
  return {
    ...copy(state),
    screen: "playing",
    level,
    quotaRemaining: LEVELS[level - 1].quota - SEEDED_CORES,
    pressure: 0,
    chainStep: 1,
    chainTimer: 0,
    machinery: null,
    cores,
    segments: [{ count: SEEDED_CORES, hold: 0 }],
    projectiles: [],
    loaded: randomCharge(level),
    queued: randomCharge(level),
    fireCooldown: 0,
    interlude: 0,
    accumulator: 0,
    nextEmitted: null,
  };
}
function copy(state: DeepReadonly<VoluteState>): VoluteState {
  return {
    ...state,
    cores: state.cores.map((c) => ({ ...c })),
    segments: state.segments.map((s) => ({ ...s })),
    projectiles: state.projectiles.map((p) => ({ ...p })),
    machinery: state.machinery ? { ...state.machinery } : null,
  };
}
function launch(state: DeepReadonly<VoluteState>): VoluteState {
  const loaded = state.loaded ?? randomCharge(state.level);
  return {
    ...copy(state),
    projectiles: [
      ...state.projectiles.map((p) => ({ ...p })),
      { charge: loaded, x: INJECTOR_X, y: INJECTOR_Y, angle: norm(state.aim) },
    ],
    loaded: state.queued ?? randomCharge(state.level),
    queued: randomCharge(state.level),
    fireCooldown: FIRE_COOLDOWN,
  };
}
function requireWhole(n: number, min: number, max: number, name: string): void {
  if (!Number.isInteger(n) || n < min || n > max)
    throw new RangeError(`${name} outside ${min}..${max}`);
}
function requireMember<T extends string>(
  value: unknown,
  values: readonly T[],
  name: string,
): asserts value is T {
  if (!values.includes(value as T)) throw new TypeError(`invalid ${name}`);
}

interface TickEvents {
  cues: Set<string>;
  extracted: {
    x: number;
    y: number;
    color: string;
    pickup: boolean;
    bore: boolean;
  }[];
}
function removeRange(
  state: VoluteState,
  from: number,
  to: number,
  step: number,
  events: TickEvents,
): VoluteState {
  const removed = state.cores.slice(from, to);
  if (!removed.length) return state;
  const at = pointAt(removed[0].s);
  events.extracted.push({
    x: at.x,
    y: at.y,
    color: CHARGE_COLORS[removed[0].charge],
    pickup: removed.some((c) => c.mark),
    bore: removed.some((c) => c.mark === "bore"),
  });
  events.cues.add(EXTRACT_CUES[Math.min(step, 5) - 1]);
  if (removed.some((c) => c.mark)) events.cues.add(CUES.machinery);
  let cores = [...state.cores.slice(0, from), ...state.cores.slice(to)].map(
    (c) => ({ ...c }),
  );
  for (let i = from; i < cores.length; i++)
    cores[i] = {
      ...cores[i],
      s: cores[i].s - Math.min(RECOIL, Math.max(0, cores[i].s)),
    };
  let machinery = state.machinery ? { ...state.machinery } : null;
  let score = state.score + removed.length * SCORE_PER_CORE * step;
  for (const core of removed)
    if (core.mark && core.mark !== "bore")
      machinery = {
        kind: core.mark,
        remaining: MACHINERY_DURATIONS[core.mark],
      };
  const boreCore = removed.find((c) => c.mark === "bore");
  if (boreCore) {
    const center = pointAt(boreCore.s);
    const bored = cores.filter((c) => {
      const p = pointAt(c.s);
      return Math.hypot(p.x - center.x, p.y - center.y) <= BORE_RADIUS;
    });
    cores = cores.filter((c) => !bored.includes(c));
    score += bored.length * SCORE_PER_CORE * step;
  }
  const segments = deriveSegments(cores).map((s, i) => ({
    ...s,
    hold: i === 0 ? s.hold : RECOIL_HOLD,
  }));
  return {
    ...state,
    cores,
    segments,
    machinery,
    score,
    pressure: clamp(
      state.pressure - removed.length * PRESSURE_DROP_PER_CORE,
      0,
      PRESSURE_MAX,
    ),
    chainStep: step,
    chainTimer: CHAIN_RESET,
  };
}
function extractAt(
  state: VoluteState,
  index: number,
  merge: boolean,
  events: TickEvents,
): VoluteState {
  const segments = deriveSegments(state.cores, state.segments);
  let startIndex = 0;
  let segStart = 0,
    segEnd = state.cores.length;
  for (const segment of segments) {
    const end = startIndex + segment.count;
    if (index >= startIndex && index < end) {
      segStart = startIndex;
      segEnd = end;
      break;
    }
    startIndex = end;
  }
  let from = index,
    to = index + 1;
  while (
    from > segStart &&
    state.cores[from - 1].charge === state.cores[index].charge
  )
    from--;
  while (to < segEnd && state.cores[to].charge === state.cores[index].charge)
    to++;
  if (to - from < MIN_RUN) return state;
  return removeRange(state, from, to, merge ? state.chainStep + 1 : 1, events);
}

function advanceTrain(state: VoluteState, events: TickEvents): VoluteState {
  if (!state.feed || !state.cores.length) return state;
  const cores = state.cores.map((c) => ({ ...c }));
  const segments = deriveSegments(cores, state.segments);
  if (state.machinery?.kind === "backflow") {
    for (let i = cores.length - 1; i >= 0; i--)
      cores[i] = {
        ...cores[i],
        s: Math.max(
          cores[i].s < 0
            ? cores[i].s
            : i === cores.length - 1
              ? 0
              : cores[i + 1].s + SPACING,
          cores[i].s - BACKFLOW_SPEED * TICK_DT,
        ),
      };
    return { ...state, cores, segments: deriveSegments(cores, segments) };
  }
  let offset = 0;
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    const rate = si === 0 ? effectiveFeed(state) : CATCHUP_SPEED;
    let move = seg.hold > 0 ? 0 : rate * TICK_DT;
    if (si > 0)
      move = Math.min(move, cores[offset - 1].s - SPACING - cores[offset].s);
    for (let i = offset; i < offset + seg.count; i++)
      cores[i] = { ...cores[i], s: cores[i].s + Math.max(0, move) };
    offset += seg.count;
  }
  let next: VoluteState = {
    ...state,
    cores,
    segments: deriveSegments(cores, segments),
  };
  const beforeCount = segments.length;
  if (next.segments.length < beforeCount) {
    for (let i = 1; i < next.cores.length; i++)
      if (
        Math.abs(next.cores[i - 1].s - next.cores[i].s - SPACING) < 1e-5 &&
        next.cores[i - 1].charge === next.cores[i].charge
      ) {
        const extracted = extractAt(next, i, true, events);
        if (extracted !== next) {
          next = extracted;
          break;
        }
      }
  }
  return next;
}
function advanceProjectiles(
  state: VoluteState,
  events: TickEvents,
): VoluteState {
  let next = state;
  const survivors: ProjectileState[] = [];
  for (const projectile of state.projectiles) {
    const radians = (projectile.angle * Math.PI) / 180;
    const moved = {
      ...projectile,
      x: projectile.x + Math.cos(radians) * PROJECTILE_SPEED * TICK_DT,
      y: projectile.y + Math.sin(radians) * PROJECTILE_SPEED * TICK_DT,
    };
    let hit = -1,
      best = Infinity;
    next.cores.forEach((core, i) => {
      const p = pointAt(core.s);
      const d = Math.hypot(moved.x - p.x, moved.y - p.y);
      if (
        d <= STRIKE_DISTANCE &&
        (d < best || (d === best && core.s > (next.cores[hit]?.s ?? -Infinity)))
      ) {
        hit = i;
        best = d;
      }
    });
    if (hit < 0) {
      if (
        moved.x >= -CORE_RADIUS &&
        moved.x <= FIELD_W + CORE_RADIUS &&
        moved.y >= -CORE_RADIUS &&
        moved.y <= FIELD_H + CORE_RADIUS
      )
        survivors.push(moved);
      continue;
    }
    events.cues.add(CUES.seat);
    const struck = next.cores[hit];
    const p = pointAt(struck.s);
    const ahead = (moved.x - p.x) * p.fx + (moved.y - p.y) * p.fy > 0;
    const insertS = ahead ? struck.s : struck.s - SPACING;
    const shifted = next.cores.map((c) =>
      c.s <= insertS ? { ...c, s: c.s - SPACING } : { ...c },
    );
    const insertIndex = ahead ? hit : hit + 1;
    shifted.splice(insertIndex, 0, {
      charge: moved.charge,
      s: insertS,
      mark: null,
    });
    next = { ...next, cores: shifted, segments: deriveSegments(shifted) };
    next = extractAt(next, insertIndex, false, events);
  }
  return { ...next, projectiles: survivors };
}
function tick(state: VoluteState, events: TickEvents): VoluteState {
  let next: VoluteState = {
    ...state,
    fireCooldown: Math.max(0, state.fireCooldown - TICK_DT),
    chainTimer: Math.max(0, state.chainTimer - TICK_DT),
    machinery: state.machinery
      ? state.machinery.remaining <= TICK_DT
        ? null
        : { ...state.machinery, remaining: state.machinery.remaining - TICK_DT }
      : null,
    segments: state.segments.map((s) => ({
      ...s,
      hold: Math.max(0, s.hold - TICK_DT),
    })),
  };
  if (next.chainTimer === 0) next = { ...next, chainStep: 1 };
  next = advanceTrain(next, events);
  next = advanceProjectiles(next, events);
  const rise =
    Math.max(0, next.cores.length - PRESSURE_FREE) * PRESSURE_RISE_PER_CORE;
  const bleed = next.cores.length <= PRESSURE_FREE ? PRESSURE_BLEED : 0;
  next = {
    ...next,
    pressure: clamp(next.pressure + (rise - bleed) * TICK_DT, 0, PRESSURE_MAX),
  };
  if (next.cores[0]?.s >= PATH_LENGTH) {
    events.cues.add(CUES.intake);
    events.cues.add(CUES.cellLost);
    const cells = next.cells - 1;
    return {
      ...next,
      cells,
      screen: cells <= 0 ? "gameover" : "setback",
      cores: [],
      segments: [],
      projectiles: [],
      pressure: 0,
      machinery: null,
      chainStep: 1,
      chainTimer: 0,
      quotaRemaining: LEVELS[next.level - 1].quota - SEEDED_CORES,
      interlude: cells <= 0 ? 0 : INTERLUDE,
      accumulator: 0,
    };
  }
  if (next.quotaRemaining === 0 && next.cores.length === 0) {
    events.cues.add(CUES.levelClear);
    return {
      ...next,
      score: next.score + CLEAR_SCORE,
      screen: next.level === LEVEL_COUNT ? "victory" : "cleared",
      interlude: next.level === LEVEL_COUNT ? 0 : INTERLUDE,
      accumulator: 0,
    };
  }
  if (
    next.emission &&
    next.machinery?.kind !== "backflow" &&
    next.quotaRemaining > 0 &&
    (!next.cores.length || next.cores[next.cores.length - 1].s >= SPACING)
  ) {
    const emitted = LEVELS[next.level - 1].quota - next.quotaRemaining + 1;
    const charge = next.nextEmitted ?? randomCharge(next.level, next.cores);
    const mark =
      emitted % MARK_INTERVAL === 0
        ? MACHINERY_KINDS[
            (emitted / MARK_INTERVAL - 1) % MACHINERY_KINDS.length
          ]
        : null;
    const cores = [...next.cores, { charge, s: 0, mark }];
    next = {
      ...next,
      cores,
      segments: deriveSegments(cores, next.segments),
      quotaRemaining: next.quotaRemaining - 1,
      nextEmitted: null,
    };
  }
  return next;
}

function snapshot(state: DeepReadonly<VoluteState>) {
  const segments = deriveSegments(state.cores, state.segments);
  let segment = 0,
    remaining = segments[0]?.count ?? 0;
  const train = state.cores.map((core) => {
    if (remaining-- === 0) {
      segment++;
      remaining = (segments[segment]?.count ?? 1) - 1;
    }
    const p = pointAt(core.s);
    return {
      s: core.s,
      x: p.x,
      y: p.y,
      charge: core.charge,
      mark: core.mark,
      segment,
    };
  });
  return {
    version: VOLUTE_DEBUG_VERSION,
    screen: state.screen,
    score: state.score,
    level: state.level,
    cells: state.cells,
    quotaRemaining: state.quotaRemaining,
    emitted: LEVELS[state.level - 1].quota - state.quotaRemaining,
    pressure: state.pressure,
    feedSpeed: effectiveFeed(state),
    chainStep: state.chainStep,
    chainTimer: state.chainTimer,
    interlude: state.interlude,
    danger: danger(state),
    train,
    segments,
    injector: {
      aim: state.aim,
      cooldown: state.fireCooldown,
      loaded: state.loaded,
      queued: state.queued,
    },
    projectiles: state.projectiles.map((p) => ({ ...p })),
    machinery: state.machinery ? { ...state.machinery } : null,
    emission: state.emission,
    feed: state.feed,
    nextEmitted: state.nextEmitted,
    muted: state.muted,
    simTime: state.simTime,
  };
}

function buildDebug(): VoluteDebugApi {
  const validNumber = (n: number, min: number, name: string) => {
    if (!Number.isInteger(n) || n < min)
      throw new RangeError(`invalid ${name}`);
  };
  return {
    version: VOLUTE_DEBUG_VERSION,
    reset: (s) => titleState(s.emission, s.feed, s.muted),
    reconcile: (s) => ({ ...copy(s), segments: deriveSegments(s.cores) }),
    snapshot,
    setScreen: (s, name) => {
      requireMember(name, SCREENS, "screen");
      return { ...copy(s), screen: name };
    },
    setLevel: (s, level) => {
      requireWhole(level, 1, LEVEL_COUNT, "level");
      return { ...copy(s), level };
    },
    setScore: (s, n) => {
      validNumber(n, 0, "score");
      return { ...copy(s), score: n };
    },
    setCells: (s, n) => {
      requireWhole(n, 0, CELLS, "cells");
      return { ...copy(s), cells: n };
    },
    setChainStep: (s, k) => {
      validNumber(k, 1, "chain step");
      return { ...copy(s), chainStep: k, chainTimer: CHAIN_RESET };
    },
    startLevel: openLevel,
    poseTrain: (s, posed) => {
      const cores = posed
        .map(([arc, charge, mark], order) => {
          if (typeof arc !== "number" || arc > PATH_LENGTH)
            throw new RangeError("invalid arc position");
          requireMember(charge, CHARGE_IDS, "charge");
          if (mark !== null) requireMember(mark, MACHINERY_KINDS, "mark");
          return { core: { s: arc, charge, mark }, order };
        })
        .sort((a, b) => b.core.s - a.core.s || a.order - b.order)
        .map((x) => x.core);
      return { ...copy(s), cores, segments: deriveSegments(cores) };
    },
    clearTrain: (s) => ({
      ...copy(s),
      cores: [],
      segments: [],
      projectiles: [],
    }),
    setLoaded: (s, charge) => {
      requireMember(charge, CHARGE_IDS, "charge");
      return { ...copy(s), loaded: charge };
    },
    setQueued: (s, charge) => {
      requireMember(charge, CHARGE_IDS, "charge");
      return { ...copy(s), queued: charge };
    },
    setAim: (s, angle) => {
      if (!Number.isFinite(angle)) throw new TypeError("invalid angle");
      return { ...copy(s), aim: norm(angle) };
    },
    fire: launch,
    setPressure: (s, value) => {
      if (!Number.isFinite(value) || value < 0 || value > PRESSURE_MAX)
        throw new RangeError("invalid pressure");
      return { ...copy(s), pressure: value };
    },
    setQuotaRemaining: (s, n) => {
      validNumber(n, 0, "quota");
      return { ...copy(s), quotaRemaining: n };
    },
    setEmission: (s, enabled) => {
      if (typeof enabled !== "boolean")
        throw new TypeError("invalid emission gate");
      return { ...copy(s), emission: enabled };
    },
    setNextEmitted: (s, charge) => {
      if (charge !== null) requireMember(charge, CHARGE_IDS, "charge");
      return { ...copy(s), nextEmitted: charge };
    },
    setFeed: (s, enabled) => {
      if (typeof enabled !== "boolean")
        throw new TypeError("invalid feed gate");
      return { ...copy(s), feed: enabled };
    },
    grantMachinery: (s, kind) => {
      requireMember(
        kind,
        ["choke", "backflow", "sightline"] as const,
        "timed machinery",
      );
      return {
        ...copy(s),
        machinery: { kind, remaining: MACHINERY_DURATIONS[kind] },
      };
    },
    pause: (s) => ({ ...copy(s), screen: "paused" }),
    resume: (s) => ({ ...copy(s), screen: "playing" }),
  };
}

async function loadAssets(api: InitApi<VoluteState>): Promise<Assets> {
  const image = (path: string) => api.assets.loadImage(path);
  const coreEntries = await Promise.all(
    CHARGE_IDS.map(
      async (id) => [id, await image(`sprites/core-${id}.png`)] as const,
    ),
  );
  const markEntries = await Promise.all(
    MACHINERY_KINDS.map(
      async (id) => [id, await image(`sprites/mark-${id}.png`)] as const,
    ),
  );
  const frames = (name: string, count: number) =>
    Promise.all(
      Array.from({ length: count }, (_, i) =>
        image(`sheets/${name}/frame-${i}.png`),
      ),
    );
  const json = async (name: string) =>
    JSON.parse(
      await (await api.assets.load(`effects/${name}/system.json`)).text(),
    ) as ParticleSystem;
  const [
    base,
    barrel,
    maw,
    plate,
    cell,
    pressure,
    recoil,
    swallow,
    flash,
    extraction,
    bore,
    intake,
    pickup,
  ] = await Promise.all([
    image("sprites/injector-base.png"),
    image("sprites/injector-barrel.png"),
    image("sprites/intake-maw.png"),
    image("sprites/channel-plate.png"),
    image("sprites/hud-cell.png"),
    image("sprites/pressure.png"),
    frames("recoil", 4),
    frames("swallow", 6),
    frames("extraction", 6),
    json("extraction-burst"),
    json("bore-detonation"),
    json("intake-spray"),
    json("pickup-shimmer"),
  ]);
  return {
    cores: Object.fromEntries(coreEntries) as Record<ChargeId, ImageBitmap>,
    marks: Object.fromEntries(markEntries) as Record<
      MachineryKind,
      ImageBitmap
    >,
    base,
    barrel,
    maw,
    plate,
    cell,
    pressure,
    recoil,
    swallow,
    flash,
    effects: { extraction, bore, intake, pickup },
  };
}

function syncMusic(state: DeepReadonly<VoluteState>, api: UpdateApi): void {
  const wanted =
    state.screen === "playing"
      ? danger(state)
        ? CUES.dangerLoop
        : CUES.hallLoop
      : null;
  for (const cue of [CUES.hallLoop, CUES.dangerLoop])
    if (cue === wanted) {
      if (!api.audio.looping(cue)) api.audio.loop(cue);
    } else api.audio.stop(cue);
}

export const game: Game<VoluteState, VoluteDebugApi> = {
  async initialize(api) {
    for (const action of ACTIONS)
      api.input.register(action, {
        keys: [...BINDINGS[action]],
        kind: action === "left" || action === "right" ? "analog" : "digital",
      });
    const audio = Object.values(CUES).map((cue) =>
      api.audio.load(cue, `audio/${cue}.wav`),
    );
    [assets] = await Promise.all([loadAssets(api), ...audio]);
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("level / score", (s) => `${s.level} / ${s.score}`);
    api.diagnostics.register("cells", (s) => s.cells);
    api.diagnostics.register("quota", (s) => s.quotaRemaining);
    api.diagnostics.register(
      "pressure / feed",
      (s) => `${s.pressure.toFixed(1)} / ${effectiveFeed(s).toFixed(1)}`,
    );
    api.diagnostics.register("chain", (s) => s.chainStep);
    api.diagnostics.register(
      "cores / head",
      (s) => `${s.cores.length} / ${s.cores[0]?.s.toFixed(1) ?? "—"}`,
    );
    api.diagnostics.register(
      "segments",
      (s) => deriveSegments(s.cores, s.segments).length,
    );
    api.diagnostics.register("danger", danger);
    api.diagnostics.register(
      "injector",
      (s) =>
        `${s.loaded ?? "—"} > ${s.queued ?? "—"} @ ${s.aim.toFixed(1)}° / ${s.fireCooldown.toFixed(2)}`,
    );
    api.diagnostics.register("projectiles", (s) => s.projectiles.length);
    api.diagnostics.register("machinery", (s) =>
      s.machinery
        ? `${s.machinery.kind} ${s.machinery.remaining.toFixed(1)}`
        : "—",
    );
    return [titleState(), buildDebug()];
  },
  update(readonly, api, dt) {
    let state = {
      ...copy(readonly),
      simTime: readonly.simTime + Math.max(0, dt),
      muted: api.audio.muted(),
    };
    if (api.input.pressed("mute")) {
      api.audio.setMuted(!api.audio.muted());
      state = { ...state, muted: api.audio.muted() };
    }
    const pointer = api.input.pointer();
    const inside =
      pointer.x >= 0 &&
      pointer.x <= FIELD_W &&
      pointer.y >= 0 &&
      pointer.y <= FIELD_H;
    const pointerPress = inside && api.input.pointerPressed();
    if (
      (state.screen === "title" ||
        state.screen === "gameover" ||
        state.screen === "victory") &&
      (api.input.pressed("confirm") || pointerPress)
    )
      state =
        state.screen === "title"
          ? openLevel({ ...state, score: 0, cells: CELLS }, 1)
          : titleState(state.emission, state.feed, state.muted);
    if (state.screen === "playing" && api.input.pressed("pause"))
      state = { ...state, screen: "paused", accumulator: 0 };
    else if (state.screen === "paused" && api.input.pressed("pause"))
      state = { ...state, screen: "playing" };
    if (state.screen === "playing") {
      if (
        api.input.pointerSamples().length > 0 &&
        (pointer.x !== INJECTOR_X || pointer.y !== INJECTOR_Y)
      )
        state = {
          ...state,
          aim: norm(
            (Math.atan2(pointer.y - INJECTOR_Y, pointer.x - INJECTOR_X) * 180) /
              Math.PI,
          ),
        };
      state = {
        ...state,
        aim: norm(
          state.aim +
            (api.input.value("right") - api.input.value("left")) *
              AIM_TURN_RATE *
              dt,
        ),
      };
      if (api.input.pressed("b") && state.loaded && state.queued) {
        state = { ...state, loaded: state.queued, queued: state.loaded };
        api.audio.play(CUES.swap);
      }
      if (api.input.pressed("a") || pointerPress) {
        if (state.fireCooldown <= 0) {
          state = launch(state);
          api.audio.play(CUES.fire);
        } else api.audio.play(CUES.denied);
      }
      let accumulator = state.accumulator + Math.min(Math.max(dt, 0), 0.25);
      const events: TickEvents = { cues: new Set(), extracted: [] };
      while (accumulator + 1e-10 >= TICK_DT && state.screen === "playing") {
        state = tick(state, events);
        accumulator -= TICK_DT;
      }
      state = {
        ...state,
        accumulator: state.screen === "playing" ? accumulator : 0,
      };
      for (const cue of events.cues) api.audio.play(cue);
    } else if (state.screen === "cleared" || state.screen === "setback") {
      const interlude = Math.max(0, state.interlude - dt);
      state = { ...state, interlude, accumulator: 0 };
      if (interlude === 0)
        state = openLevel(
          state,
          state.screen === "cleared" ? state.level + 1 : state.level,
        );
    } else state = { ...state, accumulator: 0 };
    syncMusic(state, api);
    return state;
  },
  render(state, api) {
    drawGame(state, api.ctx, api.frame().lastDeltaMs / 1000);
  },
};

function imageCentered(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  w?: number,
  h?: number,
): void {
  const width = w ?? (image as ImageBitmap).width;
  const height = h ?? (image as ImageBitmap).height;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
}
function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.fillStyle = "rgba(7,14,18,.9)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#9a7045";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 18,
  align: CanvasTextAlign = "left",
  color = "#f1dfb1",
): void {
  ctx.font = `700 ${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function drawGame(
  state: DeepReadonly<VoluteState>,
  ctx: CanvasRenderingContext2D,
  dt: number,
): void {
  if (!assets) return;
  ctx.imageSmoothingEnabled = false;
  const glow = ctx.createRadialGradient(480, 280, 40, 480, 280, 520);
  glow.addColorStop(0, "#172a2d");
  glow.addColorStop(1, BACKGROUND);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#a96939";
  ctx.lineWidth = 1;
  for (let x = 0; x < FIELD_W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD_H);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "#26343b";
  ctx.lineWidth = 38;
  ctx.lineJoin = "round";
  ctx.beginPath();
  CHANNEL.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = "#8b6241";
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let s = 0; s < PATH_LENGTH; s += 56) {
    const p = pointAt(s);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.fy, p.fx));
    ctx.globalAlpha = 0.42;
    imageCentered(ctx, assets.plate, 0, 0, 56, 38);
    ctx.restore();
  }
  label(ctx, "INLET", 42, 72, 12, "center", "#7faaa8");
  imageCentered(ctx, assets.maw, 480, 320);
  if (state.machinery?.kind === "sightline") {
    const end = rayEnd(state);
    ctx.strokeStyle = "rgba(216,255,145,.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(INJECTOR_X, INJECTOR_Y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const core of state.cores) {
    const p = pointAt(core.s);
    imageCentered(ctx, assets.cores[core.charge], p.x, p.y);
    if (core.mark) imageCentered(ctx, assets.marks[core.mark], p.x, p.y);
  }
  for (const projectile of state.projectiles)
    imageCentered(
      ctx,
      assets.cores[projectile.charge],
      projectile.x,
      projectile.y,
    );
  imageCentered(ctx, assets.base, INJECTOR_X, INJECTOR_Y);
  ctx.save();
  ctx.translate(INJECTOR_X, INJECTOR_Y);
  ctx.rotate((state.aim * Math.PI) / 180);
  const frame =
    state.fireCooldown > 0
      ? assets.recoil[
          Math.min(3, Math.floor((1 - state.fireCooldown / FIRE_COOLDOWN) * 4))
        ]
      : assets.barrel;
  ctx.drawImage(frame, 0, -10);
  ctx.restore();
  if (state.loaded)
    imageCentered(ctx, assets.cores[state.loaded], INJECTOR_X, INJECTOR_Y);
  if (state.chainTimer > CHAIN_RESET - 0.35) {
    const key = `${state.chainStep}:${Math.floor(state.simTime * 10)}`;
    const i = Math.min(5, Math.floor((CHAIN_RESET - state.chainTimer) * 15));
    if (i >= 0)
      for (const core of state.cores.slice(0, 3)) {
        const p = pointAt(core.s);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.85;
        imageCentered(ctx, assets.flash[i], p.x, p.y);
        ctx.restore();
      }
    if (lastFlashKey !== key) {
      lastFlashKey = key;
      const system = structuredClone(assets.effects.extraction);
      system.field.width = FIELD_W;
      system.field.height = FIELD_H;
      for (const e of system.emitters)
        e.position = [INJECTOR_X, FIELD_H - INJECTOR_Y, 0];
      effectPlayer = new ParticleCanvasPlayer(system, ctx, {
        clear: false,
        pixelRadius: 2.2,
        composite: "lighter",
      });
      effectContext = ctx;
    }
  }
  if (
    effectPlayer &&
    effectContext === ctx &&
    effectPlayer.simulator.capture().length
  )
    effectPlayer.update(dt);
  if (["playing", "paused", "cleared", "setback"].includes(state.screen))
    drawHud(state, ctx);
  if (danger(state)) {
    ctx.fillStyle = "rgba(196,38,32,.12)";
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
    label(ctx, "⚠ INTAKE CRITICAL", 480, 92, 22, "center", "#ff745f");
  }
  drawScreen(state, ctx);
}
function rayEnd(state: DeepReadonly<VoluteState>): { x: number; y: number } {
  const r = (state.aim * Math.PI) / 180,
    dx = Math.cos(r),
    dy = Math.sin(r);
  let max = 2000;
  for (const core of state.cores) {
    const p = pointAt(core.s);
    const ox = p.x - INJECTOR_X,
      oy = p.y - INJECTOR_Y,
      along = ox * dx + oy * dy,
      side = Math.abs(ox * dy - oy * dx);
    if (along > 0 && side <= CORE_RADIUS)
      max = Math.min(max, along - Math.sqrt(CORE_RADIUS ** 2 - side ** 2));
  }
  const edge = [
    dx > 0 ? (FIELD_W - INJECTOR_X) / dx : dx < 0 ? -INJECTOR_X / dx : Infinity,
    dy > 0 ? (FIELD_H - INJECTOR_Y) / dy : dy < 0 ? -INJECTOR_Y / dy : Infinity,
  ];
  max = Math.min(max, ...edge.filter((n) => n >= 0));
  return { x: INJECTOR_X + dx * max, y: INJECTOR_Y + dy * max };
}
function drawHud(
  state: DeepReadonly<VoluteState>,
  ctx: CanvasRenderingContext2D,
): void {
  if (!assets) return;
  panel(ctx, 250, 8, 460, 62);
  label(ctx, `SCORE ${state.score.toString().padStart(6, "0")}`, 270, 28, 16);
  label(ctx, `LEVEL ${state.level}`, 270, 51, 14, "left", "#80aaa7");
  for (let i = 0; i < state.cells; i++)
    ctx.drawImage(assets.cell, 405 + i * 27, 19);
  ctx.drawImage(assets.pressure, 505, 19);
  ctx.fillStyle = "#18272c";
  ctx.fillRect(535, 29, 92, 12);
  ctx.fillStyle = state.pressure > 70 ? "#ef5546" : "#d6a542";
  ctx.fillRect(537, 31, (88 * state.pressure) / 100, 8);
  label(ctx, `${Math.round(state.pressure)}%`, 633, 35, 12);
  if (state.loaded)
    imageCentered(ctx, assets.cores[state.loaded], 665, 30, 22, 22);
  if (state.queued)
    imageCentered(ctx, assets.cores[state.queued], 690, 48, 18, 18);
  label(ctx, "LOAD", 665, 57, 9, "center", "#83aaa8");
}
function drawScreen(
  state: DeepReadonly<VoluteState>,
  ctx: CanvasRenderingContext2D,
): void {
  if (state.screen === "playing") return;
  ctx.fillStyle =
    state.screen === "title" ? "rgba(2,8,11,.78)" : "rgba(3,8,11,.68)";
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  if (state.screen === "title") {
    label(ctx, TITLE_TEXT, 480, 150, 76, "center", "#f0c66f");
    label(
      ctx,
      "GEOTHERMAL EXTRACTION CONTROL",
      480,
      207,
      16,
      "center",
      "#77bab4",
    );
    panel(ctx, 270, 250, 420, 170);
    label(ctx, "ENTER / SPACE / TAP  —  BEGIN RUN", 480, 282, 18, "center");
    label(
      ctx,
      "← → / A D   AIM     SPACE / TAP   FIRE",
      480,
      326,
      14,
      "center",
      "#b5cfca",
    );
    label(
      ctx,
      "X   SWAP     ESC / P   PAUSE     M   MUTE",
      480,
      356,
      14,
      "center",
      "#b5cfca",
    );
    label(
      ctx,
      "Match 3 mineral cores before they reach the intake.",
      480,
      397,
      12,
      "center",
      "#7faaa8",
    );
    return;
  }
  const headings: Record<Exclude<ScreenName, "title" | "playing">, string> = {
    paused: "HALL SUSPENDED",
    cleared: `LEVEL ${state.level} CLEARED`,
    setback: "CELL SPENT",
    gameover: "PUMP HALL LOST",
    victory: "VOLUTE COMPLETE",
  };
  panel(ctx, 285, 180, 390, 180);
  label(
    ctx,
    headings[state.screen],
    480,
    222,
    30,
    "center",
    state.screen === "setback" || state.screen === "gameover"
      ? "#ff7463"
      : "#f0c66f",
  );
  if (state.screen === "paused")
    label(ctx, "ESC / P TO RESUME", 480, 300, 16, "center");
  if (state.screen === "cleared") {
    label(
      ctx,
      `SCORE ${state.score}  •  +${CLEAR_SCORE}`,
      480,
      282,
      17,
      "center",
    );
    label(
      ctx,
      `Next hall in ${state.interlude.toFixed(1)}s`,
      480,
      320,
      14,
      "center",
      "#86bbb5",
    );
  }
  if (state.screen === "setback") {
    label(
      ctx,
      `${state.cells} CELL${state.cells === 1 ? "" : "S"} REMAIN`,
      480,
      282,
      18,
      "center",
    );
    label(
      ctx,
      `Restart in ${state.interlude.toFixed(1)}s`,
      480,
      320,
      14,
      "center",
      "#86bbb5",
    );
  }
  if (state.screen === "gameover" || state.screen === "victory") {
    label(
      ctx,
      `FINAL SCORE ${state.score}  •  LEVEL ${state.level}`,
      480,
      282,
      17,
      "center",
    );
    label(
      ctx,
      "ENTER / SPACE / TAP TO RETURN",
      480,
      326,
      14,
      "center",
      "#86bbb5",
    );
  }
}
