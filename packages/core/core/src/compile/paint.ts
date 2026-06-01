import type { IRPaintSpec } from '../ir';
import type { PatternDefinition, PatternEmitContext } from '../patterns';
import type { MarkerPrimitive, PaintValue, ResolvedPatternTile, SceneResource } from '../primitive';
import { validateMarkerPrimitives } from './marker-prim';

/** fill 解析器：纯色 string 原样返回；PaintSpec 去重 + 派稳定 id → `{ kind:'resourceRef', id }`；undefined 透传 */
export type PaintResolver = (fill: string | IRPaintSpec | undefined) => PaintValue | undefined;

/** paint 资源登记表：编译期收集 PaintSpec、去重派 id，最后产出 Scene.resources */
export type PaintRegistry = {
  resolve: PaintResolver;
  resources: () => Array<SceneResource>;
};

/** 内置 / 注入都缺 defaultSize 时的 tile 周期兜底（user units） */
const FALLBACK_PATTERN_SIZE = 8;

/** motif 缺省主色：CSS `currentColor`（继承 svg color，主题反应天然） */
const DEFAULT_MOTIF_COLOR = 'currentColor';

/**
 * 查有效 pattern 表取 def；未注册名编译期 throw（消息含字母序可用名列表）
 * @description 仿 arrow / shape 的未注册 throw 风格——错误带可用名便于第三方 / LLM 自修。
 */
const lookupPatternDef = (
  shape: string,
  effective: Record<string, PatternDefinition>,
): PatternDefinition => {
  if (Object.prototype.hasOwnProperty.call(effective, shape)) return effective[shape];
  const available = Object.keys(effective).sort().join(', ');
  throw new Error(`Unknown pattern shape '${shape}'; available: ${available}`);
};

/**
 * 对一个 pattern spec 查表 + 调 `def.emit` 产已解析 tile
 * @description 构 `PatternEmitContext`（size = spec.size ?? def.defaultSize ?? 8；color = spec.color ??
 *   currentColor；background 透传；lineWidth 仅 spec 显式给值时存在——让 dots 缺省半径 size/5、lines/grid
 *   缺省描边 1）→ 调 emit 收 `MarkerPrimitive[]` → 跑共享窄子集 + JSON-safe 校验 → 组装 `ResolvedPatternTile`。
 *   emit 抛错 / 产非法原语都包成含 shape 名的清晰错（带 cause）。
 */
const resolvePatternTile = (
  spec: Extract<IRPaintSpec, { type: 'pattern' }>,
  effectivePatterns: Record<string, PatternDefinition>,
  round: (n: number) => number,
): ResolvedPatternTile => {
  const def = lookupPatternDef(spec.shape, effectivePatterns);
  // size / lineWidth / rotation 的 schema `.finite().positive()` 只在 PathSchema.parse 守门；compileToScene
  // 直接收 IR（手搓 / LLM 写法）会绕过，故 compile 是唯一真实关口——非 finite / 非正会污染 tile + Scene
  // round-trip（JSON.stringify(NaN/Infinity)=null），在此抛清晰错（含 shape 名），对齐 arrow finite 守卫。
  const rawSize = spec.size ?? def.defaultSize ?? FALLBACK_PATTERN_SIZE;
  if (!Number.isFinite(rawSize) || rawSize <= 0) {
    throw new Error(
      `Pattern '${spec.shape}' has an invalid size (${String(rawSize)}); it must be a finite number greater than 0.`,
    );
  }
  if (spec.lineWidth !== undefined && (!Number.isFinite(spec.lineWidth) || spec.lineWidth <= 0)) {
    throw new Error(
      `Pattern '${spec.shape}' has an invalid lineWidth (${String(spec.lineWidth)}); it must be a finite number greater than 0.`,
    );
  }
  if (spec.rotation !== undefined && !Number.isFinite(spec.rotation)) {
    throw new Error(
      `Pattern '${spec.shape}' has a non-finite rotation (${String(spec.rotation)}); it must be a finite number.`,
    );
  }
  const size = round(rawSize);
  const ctx: PatternEmitContext = {
    size,
    color: spec.color ?? DEFAULT_MOTIF_COLOR,
    round,
  };
  if (spec.background !== undefined) ctx.background = spec.background;
  if (spec.lineWidth !== undefined) ctx.lineWidth = spec.lineWidth;
  if (typeof def.emit !== 'function') {
    throw new Error(`Pattern '${spec.shape}' is missing an emit function (PatternDefinition.emit is required).`);
  }
  let motif: Array<MarkerPrimitive>;
  try {
    motif = [...def.emit(ctx)];
  } catch (e) {
    throw new Error(`Pattern '${spec.shape}' emit failed: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    });
  }
  validateMarkerPrimitives(`Pattern '${spec.shape}'`, motif);
  const tile: ResolvedPatternTile = { size, motif };
  if (spec.background !== undefined) tile.background = spec.background;
  if (spec.rotation !== undefined) tile.rotation = spec.rotation;
  return tile;
};

/**
 * 建一个 paint 登记表
 * @description resolve 对相同 PaintSpec（结构化 JSON 深比较）合并为一个资源、派稳定 id（`paint-1` / `paint-2`…，首见序）。
 *   同一份 IR 编译两次 → 同 id（快照稳定、SSR / CSR 一致）。SVG id 跨实例唯一性由 react adapter 加 useId 前缀解决。
 *   pattern 资源额外查 `effectivePatterns` + 调 `PatternDefinition.emit` 产 tile 写进 `SceneResource.tile`
 *   （未注册名 throw、含可用名）；gradient / image 资源只 spec。
 * @param effectivePatterns 有效 pattern 表（内置 + 注入），供 pattern 资源查表 + emit
 * @param round 精度取整（与 compile / render 同一 round，保 tile 几何一致）
 */
export const createPaintRegistry = (
  effectivePatterns: Record<string, PatternDefinition>,
  round: (n: number) => number,
): PaintRegistry => {
  const idByKey = new Map<string, string>();
  const list: Array<SceneResource> = [];
  let counter = 0;
  const resolve: PaintResolver = fill => {
    if (fill === undefined) return undefined;
    if (typeof fill === 'string') return fill;
    const key = JSON.stringify(fill);
    let id = idByKey.get(key);
    if (id === undefined) {
      counter += 1;
      id = `paint-${counter}`;
      idByKey.set(key, id);
      const resource: SceneResource = { kind: 'paint', id, spec: fill };
      // pattern 资源 emit-in-compile：查表 + 调 emit 产 tile（同 spec → 1 资源 1 tile，因 dedup 已先于此）
      if (fill.type === 'pattern') {
        resource.tile = resolvePatternTile(fill, effectivePatterns, round);
      }
      list.push(resource);
    }
    return { kind: 'resourceRef', id };
  };
  return { resolve, resources: () => list };
};
