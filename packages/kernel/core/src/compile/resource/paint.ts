import type {
  CompiledPatternTile,
  PaintValue,
  PaintResource,
  PatternResource,
  PatternEmitContext,
  PatternEmitOutput,
  ScenePrimitive,
} from '../../contract';
import { createCompositeContractError, createLayoutProbeRecoverableError, safeThrownDetail } from '../../resolve';
import type { InputPaintResolution, PaintResolution, PatternResolution } from '../../resolve';
import type { IRPatternLineStyle } from '../../schemas';
import { materializeScenePrimitives } from '../shared';
import { formatResourceId, serializeResourceContent, storeSceneResource } from './identity';
import { serializePathCommandSequence } from './path';

/** 路径图元复用命令专用序列化，其余字段保留完整 JSON 内容语义 */
const serializePatternPrimitive = (primitive: ScenePrimitive): string => {
  if (primitive.type !== 'path') return serializeResourceContent(primitive);
  const fields: Array<string> = [];
  // ⚡路径通常包含大量坐标，命令走定制序列化，样式和扩展字段仍按原内容完整处理
  for (const key of Object.keys(primitive).sort()) {
    const value: unknown = Reflect.get(primitive, key);
    if (value === undefined) continue;
    const content =
      key === 'commands'
        ? `[${serializePathCommandSequence(primitive.commands)}]`
        : value !== null && typeof value === 'object'
          ? serializeResourceContent(value)
          : JSON.stringify(value);
    fields.push(`${JSON.stringify(key)}:${content}`);
  }
  return `{${fields.join(',')}}`;
};

/** 图案外层字段固定，逐图元处理而不重复遍历完整声明 */
const serializePatternTile = (tile: CompiledPatternTile): string =>
  `{${tile.background === undefined ? '' : `"background":${JSON.stringify(tile.background)},`}"motif":[${tile.motif.map(serializePatternPrimitive).join(',')}]${tile.rotation === undefined ? '' : `,"rotation":${JSON.stringify(tile.rotation)}`},"size":${JSON.stringify(tile.size)}}`;

/** 按字段字典序投影图案声明及其线型，保持原有内容缓存键 */
const serializePatternSpec = (spec: PatternResource['spec']): string => {
  /** 线型覆盖只包含标量与数值数组 */
  const orderStyle = (style: IRPatternLineStyle | undefined): IRPatternLineStyle | undefined =>
    style === undefined
      ? undefined
      : {
          color: style.color,
          dashOffset: style.dashOffset,
          dashPattern: style.dashPattern,
          dashed: style.dashed,
          dotted: style.dotted,
          lineCap: style.lineCap,
          lineJoin: style.lineJoin,
          lineWidth: style.lineWidth,
        };
  // ⚡图案声明字段固定，直接构造有序投影，避免通用 replacer 的递归回调和字段排序
  return JSON.stringify({
    background: spec.background,
    color: spec.color,
    dashOffset: spec.dashOffset,
    dashPattern: spec.dashPattern,
    dashed: spec.dashed,
    dotted: spec.dotted,
    horizontalStyle: orderStyle(spec.horizontalStyle),
    kind: spec.kind,
    lineCap: spec.lineCap,
    lineJoin: spec.lineJoin,
    lineStyleCycle:
      spec.lineStyleCycle === undefined
        ? undefined
        : {
            overrides: spec.lineStyleCycle.overrides.map(override => ({
              index: override.index,
              style: orderStyle(override.style),
            })),
            period: spec.lineStyleCycle.period,
          },
    lineWidth: spec.lineWidth,
    rotation: spec.rotation,
    shape: spec.shape,
    size: spec.size,
    verticalStyle: orderStyle(spec.verticalStyle),
  });
};

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
  const context: PatternEmitContext = {
    size,
    ...style.base,
    round,
  };
  if (spec.background !== undefined) context.background = spec.background;
  if (style.horizontalStyle !== undefined) context.horizontalStyle = style.horizontalStyle;
  if (style.verticalStyle !== undefined) context.verticalStyle = style.verticalStyle;
  if (style.lineStyleCycle !== undefined) context.lineStyleCycle = style.lineStyleCycle;
  let emitted: PatternEmitOutput;

  try {
    emitted = definition.emit(context);
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
  const resourceIdBySpecMap = new Map<string, string>();
  /** 按最终内容身份保存资源，保持首次登记顺序 */
  const resourceMap = new Map<string, PaintResource>();

  const importResource: PaintRegistry['importResource'] = resource => {
    storeSceneResource(resource, resourceMap);
    return { kind: 'resourceRef', id: resource.id };
  };

  const register: RegisterPaint = paint => {
    if (paint === undefined || typeof paint === 'string') return paint;

    const resolution: PaintResolution = paint;
    const specKey =
      resolution.spec.kind === 'pattern'
        ? serializePatternSpec(resolution.spec)
        : serializeResourceContent(resolution.spec);
    const existingId = resourceIdBySpecMap.get(specKey);
    if (existingId !== undefined) return { kind: 'resourceRef', id: existingId };

    const resource: PaintResource =
      'pattern' in resolution
        ? { kind: 'paint', id: '', spec: resolution.spec, tile: emitPatternTile(resolution.pattern, round) }
        : resolution.spec.kind === 'image'
          ? { kind: 'paint', id: '', spec: resolution.spec }
          : { kind: 'paint', id: '', spec: resolution.spec };
    const id = formatResourceId(
      'paint',
      // ⚡复用登记缓存键的规范声明，图元仍走完整内容序列化，不改变字段或摘要语义
      'tile' in resource
        ? `{"spec":${specKey},"tile":${serializePatternTile(resource.tile)}}`
        : serializeResourceContent({ spec: resource.spec }),
    );
    resource.id = id;
    const reference = importResource(resource);
    resourceIdBySpecMap.set(specKey, id);
    return reference;
  };

  return { register, importResource, getResources: () => [...resourceMap.values()] };
};
