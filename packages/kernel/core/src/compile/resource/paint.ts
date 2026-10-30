import type {
  PaintValue,
  PatternEmitContext,
  PatternEmitResult,
  PatternEmitOutput,
  CompiledPatternTile,
  SceneResource,
  ScenePrimitive,
} from '../../contract';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import type { PaintResolution, InputPaintResolution, PatternResolution } from '../../resolve/resource';
import { collectPrimitiveResourceReferences, validateCompileResourceReferences } from './references';
import type { CompileResourceReference } from './references';
import { materializeScenePrimitives } from './scene-content';

/** Paint resource registry 输入：resolve 阶段已绑定的 paint */
type InputPaint = InputPaintResolution;

/** paint resolver 只负责把已解析值注册为 resourceRef */
export type PaintResolver = (paint: InputPaint | undefined) => PaintValue | undefined;

/** paint 资源注册表：仅负责 cache、去重和 Scene resource materialization */
export type PaintRegistry = {
  /** 解析颜色或登记可复用绘制资源，返回场景可引用的 paint */
  register: PaintResolver;
  /** 提交 probe 已解析的 paint resource，不再调用 pattern provider */
  importResolved: (resource: Extract<SceneResource, { kind: 'paint' }>) => PaintValue;
  /** 读取当前已登记的绘制资源 */
  resources: () => Array<SceneResource>;
  /** 收集 provider 图元输出中的资源引用，延迟到工作区完成时检查 */
  collectReferences: (primitives: ReadonlyArray<ScenePrimitive>, owner: string) => void;
  /** 检查当前工作区的资源引用及依赖，不遍历最终 Scene */
  validateReferences: (clips: ReadonlyArray<SceneResource>) => void;
};

/** 区分完整 tile 输出与可能携带单个同名元数据字段的图元 iterable */
const isPatternEmitResult = (value: PatternEmitOutput): value is PatternEmitResult =>
  'tileSize' in value && 'motif' in value;

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
const resolvePatternTile = (resolution: PatternResolution, round: (n: number) => number): CompiledPatternTile => {
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
  const emittedMotif = isPatternEmitResult(emitted) ? emitted.motif : emitted;
  if (isPatternEmitResult(emitted)) {
    if (!Number.isFinite(emitted.tileSize) || emitted.tileSize <= 0) {
      throw createCompositeContractError(
        `Pattern '${spec.shape}' emit returned an invalid tileSize (${String(emitted.tileSize)}); it must be a finite number greater than 0.`,
      );
    }

    tileSize = round(emitted.tileSize);
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
  /** 图元引用按种类与 ID 去重，保留首次输出处的诊断位置 */
  const references = new Map<string, CompileResourceReference>();
  /** Pattern 资源间的引用边，不保存图元副本 */
  const dependencies = new Map<string, Array<CompileResourceReference>>();
  let counter = 0;

  const insert = (key: string, resourceOf: (id: string) => SceneResource): string => {
    let id = idByKey.get(key);
    if (id !== undefined) return id;

    counter += 1;
    id = `paint-${counter}`;
    idByKey.set(key, id);
    const resource = resourceOf(id);
    list.push(resource);
    if (resource.kind === 'paint' && 'tile' in resource) {
      const resourceReferences = collectPrimitiveResourceReferences(resource.tile.motif, `resource '${id}'.motif`);
      if (resourceReferences.length > 0) dependencies.set(id, resourceReferences);
    }
    if (resource.kind === 'paint')
      idByKey.set(paintKeyOf({ spec: resource.spec, tile: 'tile' in resource ? resource.tile : undefined }), id);

    return id;
  };

  const register: PaintResolver = paint => {
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
          tile: resolvePatternTile(resolution.pattern, round),
        };
      }
      const spec = resolution.spec;
      return spec.kind === 'image' ? { kind: 'paint', id: nextId, spec } : { kind: 'paint', id: nextId, spec };
    });

    return { kind: 'resourceRef', id };
  };

  const importResolved = (resource: Extract<SceneResource, { kind: 'paint' }>): PaintValue => {
    const key = paintKeyOf({ spec: resource.spec, tile: 'tile' in resource ? resource.tile : undefined });
    const id = insert(key, nextId => ({ ...resource, id: nextId }));
    return { kind: 'resourceRef', id };
  };

  return {
    register,
    importResolved,
    resources: () => list,
    collectReferences: (primitives, owner) => {
      for (const reference of collectPrimitiveResourceReferences(primitives, owner)) {
        const key = `${reference.kind}:${reference.id}`;
        if (!references.has(key)) references.set(key, reference);
      }
    },
    validateReferences: clips => {
      if (references.size === 0 && dependencies.size === 0) return;
      validateCompileResourceReferences(references.values(), dependencies, [...list, ...clips]);
    },
  };
};
