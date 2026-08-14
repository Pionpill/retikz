import type {
  PaintValue,
  PatternDefinition,
  PatternEmitContext,
  PatternEmitResult,
  ResolvedPatternTile,
  SceneResource,
} from '../../contract';
import type { IRPaintSpec } from '../../schemas';

import { providerDefinitionOf } from '../../providers/registry/index';
import { CompositeContractError, LayoutProbeRecoverableError, safeThrownDetail } from '../../resolve/diagnostics';
import { validateMarkerPrimitives } from './marker-primitive';
import { resolvePatternStyleContext } from './pattern-style';

/** paint 解析器：纯色 string 原样返回；PaintSpec 去重 + 派稳定 id → `{ kind:'resourceRef', id }`；undefined 透传 */
export type PaintResolver = (paint: string | IRPaintSpec | undefined) => PaintValue | undefined;

/** paint 资源登记表：编译期收集 PaintSpec、去重派 id，最后产出 Scene.resources */
export type PaintRegistry = {
  register: PaintResolver;
  /** 提交 probe 已解析的 paint 资源，不再次调用 pattern provider */
  importResolved: (resource: Extract<SceneResource, { kind: 'paint' }>) => PaintValue;
  resources: () => Array<SceneResource>;
};

/** 内置 / 注入都缺 defaultSize 时的 tile 周期兜底（user units） */
const FALLBACK_PATTERN_SIZE = 8;

/** motif 缺省主色：CSS `currentColor`（继承 svg color，主题反应天然） */
const DEFAULT_MOTIF_COLOR = 'currentColor';

/** 判断 emit 输出是否为显式 tile 结果；两个必需字段同时存在才进入该分支 */
const isPatternEmitResult = (value: unknown): value is PatternEmitResult =>
  typeof value === 'object' &&
  value !== null &&
  Object.prototype.hasOwnProperty.call(value, 'tileSize') &&
  Object.prototype.hasOwnProperty.call(value, 'motif');

/** 解析 pattern paint spec 为 Scene resource tile */
const resolvePatternTile = (
  spec: Extract<IRPaintSpec, { kind: 'pattern' }>,
  effectivePatterns: ReadonlyMap<string, PatternDefinition>,
  round: (n: number) => number,
): ResolvedPatternTile => {
  const def = providerDefinitionOf(effectivePatterns, spec.shape, {
    capability: 'pattern shape',
    optionName: 'patterns',
  });
  // PatternPaintSpecSchema 只在显式 parse 时守门；compileToScene 直接收 IR（手搓 / LLM 写法）会绕过，
  // 故 compile 是唯一真实关口——非法数值会污染 tile + Scene round-trip
  // （JSON.stringify(NaN/Infinity)=null），在此抛清晰错（含 shape 名），对齐 arrow finite 守卫。
  const rawSize = spec.size ?? def.defaultSize ?? FALLBACK_PATTERN_SIZE;
  if (!Number.isFinite(rawSize) || rawSize <= 0) {
    throw new Error(
      `Pattern '${spec.shape}' has an invalid size (${String(rawSize)}); it must be a finite number greater than 0.`,
    );
  }
  if (spec.rotation !== undefined && !Number.isFinite(spec.rotation)) {
    throw new Error(
      `Pattern '${spec.shape}' has a non-finite rotation (${String(spec.rotation)}); it must be a finite number.`,
    );
  }
  const size = round(rawSize);
  const styleContext = resolvePatternStyleContext(spec, DEFAULT_MOTIF_COLOR);
  const ctx: PatternEmitContext = {
    size,
    ...styleContext.base,
    round,
  };
  if (spec.background !== undefined) ctx.background = spec.background;
  if (styleContext.horizontalStyle !== undefined) ctx.horizontalStyle = styleContext.horizontalStyle;
  if (styleContext.verticalStyle !== undefined) ctx.verticalStyle = styleContext.verticalStyle;
  if (styleContext.lineStyleCycle !== undefined) ctx.lineStyleCycle = styleContext.lineStyleCycle;
  if (typeof def.emit !== 'function') {
    throw new CompositeContractError(
      `Pattern '${spec.shape}' is missing an emit function (PatternDefinition.emit is required).`,
    );
  }
  let emitted: unknown;
  try {
    emitted = def.emit(ctx);
  } catch (e) {
    throw new LayoutProbeRecoverableError(`Pattern '${spec.shape}' emit failed: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `pattern:${spec.shape}`,
    });
  }
  let tileSize = size;
  let emittedMotif = emitted;
  if (isPatternEmitResult(emitted)) {
    if (typeof emitted.tileSize !== 'number' || !Number.isFinite(emitted.tileSize) || emitted.tileSize <= 0) {
      throw new CompositeContractError(
        `Pattern '${spec.shape}' emit returned an invalid tileSize (${String(emitted.tileSize)}); it must be a finite number greater than 0.`,
      );
    }
    tileSize = round(emitted.tileSize);
    emittedMotif = emitted.motif;
  }
  const motif = validateMarkerPrimitives(`Pattern '${spec.shape}' motif`, emittedMotif);
  const tile: ResolvedPatternTile = { size: tileSize, motif };
  if (spec.background !== undefined) tile.background = spec.background;
  if (spec.rotation !== undefined) tile.rotation = spec.rotation;
  return tile;
};

/** 创建 paint 资源登记表，按 spec 稳定去重 */
export const createPaintRegistry = (
  effectivePatterns: ReadonlyMap<string, PatternDefinition>,
  round: (n: number) => number,
): PaintRegistry => {
  const idByKey = new Map<string, string>();
  const list: Array<SceneResource> = [];
  let counter = 0;
  const insert = (key: string, resourceOf: (id: string) => SceneResource): string => {
    let id = idByKey.get(key);
    if (id !== undefined) return id;
    counter += 1;
    id = `paint-${counter}`;
    idByKey.set(key, id);
    list.push(resourceOf(id));
    return id;
  };
  const register: PaintResolver = paint => {
    if (paint === undefined) return undefined;
    if (typeof paint === 'string') return paint;
    const key = JSON.stringify(paint);
    const id = insert(key, nextId => {
      const resource: SceneResource = { kind: 'paint', id: nextId, spec: paint };
      // pattern 资源 emit-in-compile：查表 + 调 emit 产 tile（同 spec → 1 资源 1 tile，因 dedup 已先于此）
      if (paint.kind === 'pattern') {
        resource.tile = resolvePatternTile(paint, effectivePatterns, round);
      }
      return resource;
    });
    return { kind: 'resourceRef', id };
  };
  const importResolved = (resource: Extract<SceneResource, { kind: 'paint' }>): PaintValue => {
    const key = JSON.stringify(resource.spec);
    const id = insert(key, nextId => ({ ...resource, id: nextId }));
    return { kind: 'resourceRef', id };
  };
  return { register, importResolved, resources: () => list };
};
