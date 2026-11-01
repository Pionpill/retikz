import type {
  CompiledPatternTile,
  PaintValue,
  PatternEmitContext,
  PatternEmitOutput,
  ScenePrimitive,
  SceneResource,
} from '../../contract';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import type { InputPaintResolution, PaintResolution, PatternResolution } from '../../resolve/resource';
import { materializeScenePrimitives } from './scene-content';

/** 登记已解析的绘制资源，普通颜色直接返回 */
export type RegisterPaint = (paint: InputPaintResolution | undefined) => PaintValue | undefined;

/** paint 资源注册表：仅负责 cache、去重和 Scene resource materialization */
export type PaintRegistry = {
  /** 透传颜色或登记绘制资源，返回场景可引用的绘制值 */
  register: RegisterPaint;
  /** 导入已生成的绘制资源，不再调用 Pattern provider */
  importResource: (resource: Extract<SceneResource, { kind: 'paint' }>) => Extract<PaintValue, { kind: 'resourceRef' }>;
  /** 读取当前已登记的绘制资源 */
  getResources: () => Array<SceneResource>;
};

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
const emitPatternTile = (resolution: PatternResolution, round: (n: number) => number): CompiledPatternTile => {
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
  let emitted: PatternEmitOutput;

  try {
    emitted = definition.emit(ctx);
  } catch (e) {
    throw createLayoutProbeRecoverableError(`Pattern '${spec.shape}' emit failed: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `pattern:${spec.shape}`,
    });
  }

  let tileSize = size;
  if ('resources' in emitted) {
    throw createCompositeContractError(`Pattern '${spec.shape}' output: provider cannot declare resources.`);
  }
  let emittedMotif: Iterable<ScenePrimitive>;
  // 同时检查两个字段，避免将携带单个同名元数据字段的 iterable 误判为完整 tile
  if ('tileSize' in emitted && 'motif' in emitted) {
    emittedMotif = emitted.motif;
    if (!Number.isFinite(emitted.tileSize) || emitted.tileSize <= 0) {
      throw createCompositeContractError(
        `Pattern '${spec.shape}' emit returned an invalid tileSize (${String(emitted.tileSize)}); it must be a finite number greater than 0.`,
      );
    }

    tileSize = round(emitted.tileSize);
  } else {
    emittedMotif = emitted;
  }

  const motif = materializeScenePrimitives(`Pattern '${spec.shape}' motif`, emittedMotif);
  const tile: CompiledPatternTile = { size: tileSize, motif };
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
    const resource = resourceOf(id);
    list.push(resource);
    if (resource.kind === 'paint')
      idByKey.set(paintKeyOf({ spec: resource.spec, tile: 'tile' in resource ? resource.tile : undefined }), id);

    return id;
  };

  const register: RegisterPaint = paint => {
    if (paint === undefined) return undefined;
    if (typeof paint === 'string') return paint;

    const resolution: PaintResolution = paint;
    const key = paintKeyOf(resolution.spec);
    const id = insert(key, nextId => {
      if ('pattern' in resolution) {
        return {
          kind: 'paint',
          id: nextId,
          spec: resolution.spec,
          tile: emitPatternTile(resolution.pattern, round),
        };
      }
      const spec = resolution.spec;
      return spec.kind === 'image' ? { kind: 'paint', id: nextId, spec } : { kind: 'paint', id: nextId, spec };
    });

    return { kind: 'resourceRef', id };
  };

  const importResource: PaintRegistry['importResource'] = resource => {
    const key = paintKeyOf({ spec: resource.spec, tile: 'tile' in resource ? resource.tile : undefined });
    const id = insert(key, nextId => ({ ...resource, id: nextId }));
    return { kind: 'resourceRef', id };
  };

  return {
    register,
    importResource,
    getResources: () => list,
  };
};
