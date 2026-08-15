import type {
  PaintValue,
  PatternEmitContext,
  PatternEmitResult,
  ResolvedPatternTile,
  SceneResource,
} from '../../contract';
import type { PaintResolution, PaintResolutionInput, PatternResolution } from '../../resolve/resource';

import { CompositeContractError, LayoutProbeRecoverableError, safeThrownDetail } from '../../resolve/diagnostics';
import { validateMarkerPrimitives } from './marker-primitive';

/** Paint resource registry 输入：resolve 阶段已绑定的 paint */
export type PaintInput = PaintResolutionInput;

/** paint resolver 只负责把已解析值注册为 resourceRef */
export type PaintResolver = (paint: PaintInput | undefined) => PaintValue | undefined;

/** paint 资源注册表：仅负责 cache、去重和 Scene resource materialization */
export type PaintRegistry = {
  register: PaintResolver;
  /** 提交 probe 已解析的 paint resource，不再调用 pattern provider */
  importResolved: (resource: Extract<SceneResource, { kind: 'paint' }>) => PaintValue;
  resources: () => Array<SceneResource>;
};

const isPatternEmitResult = (value: unknown): value is PatternEmitResult =>
  typeof value === 'object' &&
  value !== null &&
  Object.prototype.hasOwnProperty.call(value, 'tileSize') &&
  Object.prototype.hasOwnProperty.call(value, 'motif');

/** 生成与对象属性插入顺序无关的 paint resource key */
const paintKeyOf = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(paintKeyOf).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${paintKeyOf(Reflect.get(value, key))}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

/** compile 仅消费 resolve 阶段已绑定的 pattern 并调用 provider emit */
const resolvePatternTile = (resolution: PatternResolution, round: (n: number) => number): ResolvedPatternTile => {
  const { spec, definition, size, style } = resolution;
  const ctx: PatternEmitContext = {
    size,
    ...style.base,
    round,
  };
  if (spec.background !== undefined) ctx.background = spec.background;
  if (style.horizontalStyle !== undefined) ctx.horizontalStyle = style.horizontalStyle;
  if (style.verticalStyle !== undefined) ctx.verticalStyle = style.verticalStyle;
  if (style.lineStyleCycle !== undefined) ctx.lineStyleCycle = style.lineStyleCycle;
  if (typeof definition.emit !== 'function') {
    throw new CompositeContractError(
      `Pattern '${spec.shape}' is missing an emit function (PatternDefinition.emit is required).`,
    );
  }
  let emitted: unknown;
  try {
    emitted = definition.emit(ctx);
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

/** 创建 compile resource 注册表 */
export const createPaintRegistry = (round: (n: number) => number): PaintRegistry => {
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
    const resolution: PaintResolution = paint;
    const key = paintKeyOf(resolution.spec);
    const id = insert(key, nextId => {
      const resource: Extract<SceneResource, { kind: 'paint' }> = {
        kind: 'paint',
        id: nextId,
        spec: resolution.spec,
      };
      if (resolution.pattern !== undefined) resource.tile = resolvePatternTile(resolution.pattern, round);
      return resource;
    });
    return { kind: 'resourceRef', id };
  };
  const importResolved = (resource: Extract<SceneResource, { kind: 'paint' }>): PaintValue => {
    const key = paintKeyOf(resource.spec);
    const id = insert(key, nextId => ({ ...resource, id: nextId }));
    return { kind: 'resourceRef', id };
  };
  return { register, importResolved, resources: () => list };
};
