import type {
  CompiledPatternTile,
  PaintValue,
  PaintResource,
  PatternEmitContext,
  PatternEmitOutput,
  ScenePrimitive,
} from '../../contract';
import { createCompositeContractError, createLayoutProbeRecoverableError, safeThrownDetail } from '../../resolve';
import type { InputPaintResolution, PaintResolution, PatternResolution } from '../../resolve';
import { materializeScenePrimitives } from '../shared';
import { createResourceId, serializeResourceContent, storeSceneResource } from './identity';

/** 登记已解析的绘制资源，普通颜色直接返回 */
export type RegisterPaint = (paint: InputPaintResolution | undefined) => PaintValue | undefined;

/** paint 资源注册表：仅负责 cache、去重和 Scene resource materialization */
export type PaintRegistry = {
  /** 透传颜色或登记绘制资源，返回场景可引用的绘制值 */
  register: RegisterPaint;
  /** 导入已生成的绘制资源，不再调用 Pattern provider */
  importResource: (resource: PaintResource) => Extract<PaintValue, { kind: 'resourceRef' }>;
  /** 读取当前已登记的绘制资源 */
  getResources: () => Array<PaintResource>;
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
  /** 当前编译内已发射的声明；导入内容不能代替本地 provider 的输出 */
  const idBySpec = new Map<string, string>();
  /** 按最终内容身份保存资源，保持首次登记顺序 */
  const resources = new Map<string, PaintResource>();

  const importResource: PaintRegistry['importResource'] = resource => {
    storeSceneResource(resource, resources);
    return { kind: 'resourceRef', id: resource.id };
  };

  const register: RegisterPaint = paint => {
    if (paint === undefined || typeof paint === 'string') return paint;

    const resolution: PaintResolution = paint;
    const specKey = serializeResourceContent(resolution.spec);
    const existingId = idBySpec.get(specKey);
    if (existingId !== undefined) return { kind: 'resourceRef', id: existingId };

    const resource: PaintResource =
      'pattern' in resolution
        ? { kind: 'paint', id: '', spec: resolution.spec, tile: emitPatternTile(resolution.pattern, round) }
        : resolution.spec.kind === 'image'
          ? { kind: 'paint', id: '', spec: resolution.spec }
          : { kind: 'paint', id: '', spec: resolution.spec };
    const id = createResourceId(
      'paint',
      serializeResourceContent({
        spec: resource.spec,
        tile: 'tile' in resource ? resource.tile : undefined,
      }),
    );
    resource.id = id;
    const reference = importResource(resource);
    idBySpec.set(specKey, id);
    return reference;
  };

  return { register, importResource, getResources: () => [...resources.values()] };
};
