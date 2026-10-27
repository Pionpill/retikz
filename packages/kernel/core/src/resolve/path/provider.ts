import type { ArrowDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { providerDefinitionOf } from '../../providers';
import type { IRArrowStyle, IRPathBase } from '../../schemas';
import { DEFAULT_ARROW_SHAPE } from '../../schemas';
import { createCompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider-payload';
import { resolveMarkStyle } from './mark';
import type {
  ArrowMarkGeometry,
  ArrowMarkResolution,
  MarkResolution,
  PathDefinitionResolution,
  PathResolution,
  PathResolveContext,
  ResolvedMarkStyle,
  ResolvedPathSource,
  StrokePathResolution,
} from './types';

const ARROW_GEOMETRY_BASE_SIZE = 10;

/** 路径描边与箭头接触处的重叠量，以宿主线宽为单位 */
const ARROW_PATH_CONTACT_OVERLAP = 0.5;

/** 查找路径定义，并用其完整 schema 解析路径输入 */
export const resolvePathDefinition = (
  path: ResolvedPathSource,
  context: PathResolveContext,
  irPath: string,
): PathDefinitionResolution => {
  const kind = path.kind ?? 'stroke';
  const definition = providerDefinitionOf(context.paths, kind);
  const parsed = parseProviderPayload({
    capability: 'path',
    providerName: kind,
    irPath,
    payloadName: 'path',
    schema: definition.schema,
    value: path,
  });

  return { name: kind, definition, path: parsed as IRPathBase };
};

/** 检查箭头定义的几何数值，以及后缘、接触点、尖端的先后关系 */
const assertFiniteArrowGeometry = (shape: string, definition: ArrowDefinition): void => {
  if (!Number.isFinite(definition.backX)) {
    throw createCompositeContractError(
      `Arrow '${shape}' has a non-finite backX (${String(definition.backX)}); it must be a finite number.`,
    );
  }

  if (!Number.isFinite(definition.lineContactX)) {
    throw createCompositeContractError(
      `Arrow '${shape}' has a non-finite lineContactX (${String(definition.lineContactX)}); it must be a finite number.`,
    );
  }

  if (definition.baseSize !== undefined && (!Number.isFinite(definition.baseSize) || definition.baseSize <= 0)) {
    throw createCompositeContractError(
      `Arrow '${shape}' has an invalid baseSize (${String(definition.baseSize)}); it must be a finite number greater than 0.`,
    );
  }

  if (definition.tipX !== undefined && !Number.isFinite(definition.tipX)) {
    throw createCompositeContractError(
      `Arrow '${shape}' has a non-finite tipX (${String(definition.tipX)}); it must be a finite number.`,
    );
  }

  if (definition.outerInset !== undefined && !Number.isFinite(definition.outerInset)) {
    throw createCompositeContractError(
      `Arrow '${shape}' has a non-finite outerInset (${String(definition.outerInset)}); it must be a finite number.`,
    );
  }

  const tipX = definition.tipX ?? definition.baseSize ?? ARROW_GEOMETRY_BASE_SIZE;
  if (definition.backX > definition.lineContactX || definition.lineContactX > tipX) {
    throw createCompositeContractError(
      `Arrow '${shape}' geometry must satisfy backX <= lineContactX <= tipX; received ${String(definition.backX)} <= ${String(definition.lineContactX)} <= ${String(tipX)}.`,
    );
  }
};

/** 绑定箭头定义，确定外观、有效尺寸及端点接触与收缩参数 */
export const resolveArrowMark = (mark: ResolvedMarkStyle, context: PathResolveContext): ArrowMarkResolution => {
  const shape = mark.shape ?? DEFAULT_ARROW_SHAPE;
  const definition = providerDefinitionOf(context.arrows, shape);
  assertFiniteArrowGeometry(shape, definition);
  const shared = resolveMarkStyle(mark, definition, context);
  const { visual } = shared;
  const { baseSize, resolvedLength, resolvedWidth } = shared.geometry;
  const tipX = definition.tipX ?? baseSize;
  const contactX = definition.hollow ? definition.lineContactX - visual.lineWidth / 2 : definition.lineContactX;
  const rawOuterInset = definition.outerInset ?? (definition.hollow ? visual.lineWidth / 2 : 0);
  const visualBackX = definition.backX - rawOuterInset;
  const boundaryOuterInset = (rawOuterInset * resolvedLength) / baseSize;
  if (!Number.isFinite(boundaryOuterInset)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Arrow '${shape}' resolved outerInset is non-finite; use smaller outerInset / length / scale values.`,
    );
  }

  if (!Number.isFinite(visualBackX)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Arrow '${shape}' resolved visual back is non-finite; use smaller backX / outerInset values.`,
    );
  }

  const geometry: ArrowMarkGeometry = {
    baseSize,
    tipX,
    visualBackX,
    contactX,
    resolvedLength,
    resolvedWidth,
    boundaryOuterInset,
    // 主路径用 butt cap 绘制；向 marker 内覆盖半个自身描边宽度，避免相切边界分别抗锯齿后出现缝隙
    shrink: ((tipX - contactX) * resolvedLength) / baseSize - ARROW_PATH_CONTACT_OVERLAP,
  };
  if (!Number.isFinite(geometry.shrink)) {
    throw createCompositeContractError(
      `Arrow '${shape}' resolved shrink is non-finite; use smaller tip/contact/length values.`,
    );
  }

  return { mark, definition, visual, geometry };
};

/** 解析已声明的起点、终点箭头，并以声明对象为键保存结果 */
const resolveEndpointArrowProviders = (
  arrow: ResolvedPathSource['arrow'],
  context: PathResolveContext,
): ReadonlyMap<IRArrowStyle, ArrowMarkResolution> => {
  /** 按端点声明对象索引的箭头解析结果 */
  const resolutionMap = new Map<IRArrowStyle, ArrowMarkResolution>();
  for (const endpoint of [arrow?.start, arrow?.end])
    if (endpoint !== undefined) resolutionMap.set(endpoint, resolveArrowMark(endpoint, context));
  return resolutionMap;
};

/**
 * 为 Stroke 路径补齐缺省填充和描边，并绑定箭头与沿线标记定义
 * @description 不足以绘制的步骤序列返回空绑定表，单个矩形步骤除外
 */
export const resolveStrokePathProviders = (
  resolution: PathResolution,
  context: PathResolveContext,
): StrokePathResolution => {
  const path = {
    ...resolution.path,
    fill: resolution.path.fill ?? 'none',
    stroke: resolution.path.stroke ?? 'currentColor',
  };
  const children = path.children;
  const strokeTooShort = children === undefined || (children.length < 2 && children[0]?.kind !== 'rectangle');
  if (strokeTooShort) {
    return { ...resolution, path, arrows: new Map(), marks: new Map() };
  }

  /** 按标记声明对象索引的解析结果 */
  const marks = new Map<NonNullable<typeof path.marks>[number], MarkResolution>();
  for (const [index, placement] of (path.marks ?? []).entries()) {
    const shape = placement.shape ?? DEFAULT_ARROW_SHAPE;
    const definition = context.marks?.get(shape);
    if (definition === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Provider,
        `Unknown provider '${shape}' at ${context.irPath}.marks[${index}].shape; available: ${[...(context.marks?.keys() ?? [])].sort().join(', ') || '(none registered)'}.`,
      );
    marks.set(placement, resolveMarkStyle(placement, definition, context));
  }
  return {
    ...resolution,
    path,
    arrows: resolveEndpointArrowProviders(path.arrow, context),
    marks,
  };
};
