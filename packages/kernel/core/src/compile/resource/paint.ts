import type { PatternDefinition, PatternEmitContext } from '../../contract';
import type { MarkerPrimitive, PaintValue, ResolvedPatternTile, SceneResource } from '../../contract';
import type { IRPaintSpec } from '../../schemas';

import { providerDefinitionOf } from '../../providers/registry';
import { validateMarkerPrimitives } from './marker-primitive';

/** paint 解析器：纯色 string 原样返回；PaintSpec 去重 + 派稳定 id → `{ kind:'resourceRef', id }`；undefined 透传 */
export type PaintResolver = (paint: string | IRPaintSpec | undefined) => PaintValue | undefined;

/** paint 资源登记表：编译期收集 PaintSpec、去重派 id，最后产出 Scene.resources */
export type PaintRegistry = {
  resolve: PaintResolver;
  resources: () => Array<SceneResource>;
};

/** 内置 / 注入都缺 defaultSize 时的 tile 周期兜底（user units） */
const FALLBACK_PATTERN_SIZE = 8;

/** motif 缺省主色：CSS `currentColor`（继承 svg color，主题反应天然） */
const DEFAULT_MOTIF_COLOR = 'currentColor';

/** 解析 pattern paint spec 为 Scene resource tile。 */
const resolvePatternTile = (
  spec: Extract<IRPaintSpec, { kind: 'pattern' }>,
  effectivePatterns: ReadonlyMap<string, PatternDefinition>,
  round: (n: number) => number,
): ResolvedPatternTile => {
  const def = providerDefinitionOf(effectivePatterns, spec.shape, {
    capability: 'pattern shape',
    optionName: 'patterns',
  });
  // size / lineWidth / rotation 的 schema `.positive()` 只在 PathSchema.parse 守门；compileToScene
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

/** 创建 paint 资源登记表，按 spec 稳定去重。 */
export const createPaintRegistry = (
  effectivePatterns: ReadonlyMap<string, PatternDefinition>,
  round: (n: number) => number,
): PaintRegistry => {
  const idByKey = new Map<string, string>();
  const list: Array<SceneResource> = [];
  let counter = 0;
  const resolve: PaintResolver = paint => {
    if (paint === undefined) return undefined;
    if (typeof paint === 'string') return paint;
    const key = JSON.stringify(paint);
    let id = idByKey.get(key);
    if (id === undefined) {
      counter += 1;
      id = `paint-${counter}`;
      idByKey.set(key, id);
      const resource: SceneResource = { kind: 'paint', id, spec: paint };
      // pattern 资源 emit-in-compile：查表 + 调 emit 产 tile（同 spec → 1 资源 1 tile，因 dedup 已先于此）
      if (paint.kind === 'pattern') {
        resource.tile = resolvePatternTile(paint, effectivePatterns, round);
      }
      list.push(resource);
    }
    return { kind: 'resourceRef', id };
  };
  return { resolve, resources: () => list };
};
