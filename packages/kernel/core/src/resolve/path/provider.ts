import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { getProviderDefinition } from '../../providers';
import type { IRArrowStyle, IRPathBase } from '../../schemas';
import { DEFAULT_ARROW_SHAPE } from '../../schemas';
import { createCompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider';
import { resolveMarkStyle } from './mark';
import type {
  ArrowMarkGeometry,
  ArrowMarkResolution,
  MarkResolution,
  PathDefinitionResolution,
  PathResolution,
  PathResolveContext,
  MarkColorSource,
  PathColorSource,
  StrokePathResolution,
} from './types';

/** 路径描边与箭头接触处的重叠量，以宿主线宽为单位 */
const ARROW_PATH_CONTACT_OVERLAP = 0.5;

/** 查找路径定义，并用其完整 schema 解析路径输入 */
export const resolvePathDefinition = (
  path: PathColorSource,
  context: PathResolveContext,
  irPath: string,
): PathDefinitionResolution => {
  const kind = path.kind ?? 'stroke';
  const definition = getProviderDefinition(context.pathRegistry, kind);
  const parsed = parseProviderPayload({
    capability: 'path',
    providerName: kind,
    irPath,
    payloadName: 'path',
    schema: definition.schema,
    value: path,
  });

  return { kind, definition, path: parsed as IRPathBase };
};

/** 绑定箭头定义，确定外观、有效尺寸及端点接触与收缩参数 */
export const resolveArrowMark = (mark: MarkColorSource, context: PathResolveContext): ArrowMarkResolution => {
  const shape = mark.shape ?? DEFAULT_ARROW_SHAPE;
  const definition = getProviderDefinition(context.arrowRegistry, shape);
  const shared = resolveMarkStyle(mark, definition, context);
  const { mark: canonicalMark } = shared;
  const { baseSize, resolvedLength, resolvedWidth } = shared.geometry;
  const tipX = definition.tipX ?? baseSize;
  const contactX = definition.hollow ? definition.lineContactX - canonicalMark.lineWidth / 2 : definition.lineContactX;
  const rawOuterInset = definition.outerInset ?? (definition.hollow ? canonicalMark.lineWidth / 2 : 0);
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

  return { source: mark, definition, mark: canonicalMark, geometry };
};

/** 解析已声明的起点、终点箭头，并以声明对象为键保存结果 */
const resolveEndpointArrowProviders = (
  arrow: PathColorSource['arrow'],
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
    const definition = context.markRegistry?.get(shape);
    if (definition === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Provider,
        `Unknown provider '${shape}' at ${context.irPath}.marks[${index}].shape; available: ${[...(context.markRegistry?.keys() ?? [])].sort().join(', ') || '(none registered)'}.`,
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
