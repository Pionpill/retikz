import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRAxisScale, IRBoxSize, IRNode, IRPaintValue } from '../../schemas';
import { NodeSchema } from '../../schemas';
import { resolvePaint } from '../resource';
import { resolveBoxSpacing } from '../spacing';
import { resolveGraphicOpacity } from '../style';
import { resolveContextualColor, resolveDashPattern, resolveDropShadow, mergeNodeStyle } from '../style';
import { resolveNodeBoundary } from './boundary';
import { resolveNodeShape } from './shape';
import { expandNodeText, expandNodeLabels, resolveNodeDependentColors, resolveNodeTextColor } from './text';
import type {
  CanonicalNode,
  NodeResolution,
  NodeResolveContext,
  NodeColorSource,
  NodeLabelSource,
  NodeLabelPrimaryColorSource,
} from './types';

/** 节点缺省内边距 */
const DEFAULT_NODE_PADDING = 8;

/** 将节点缩放展开为 x、y 两轴系数，未指定时为 1 */
const expandAxisScale = (value: number | IRAxisScale | undefined): CanonicalNode['scale'] => {
  if (typeof value === 'number') return { x: value, y: value };

  const base = value?.default ?? 1;

  return {
    x: value?.x ?? base,
    y: value?.y ?? base,
  };
};

/** 将最小尺寸展开为宽和高，未指定时为 0 */
const expandBoxSize = (value: number | IRBoxSize | undefined): CanonicalNode['minimumSize'] => {
  if (typeof value === 'number') return { width: value, height: value };

  const base = value?.default ?? 0;

  return {
    width: value?.width ?? base,
    height: value?.height ?? base,
  };
};

/** 展开节点简写与默认值，将样式、布局字段合入节点结果，绘制资源随后解析 */
const expandNodeFields = (
  node: NodeColorSource,
): Omit<CanonicalNode, 'fill' | 'stroke'> & Pick<NonNullable<NodeColorSource['style']>, 'fill' | 'stroke'> => {
  const { style, layout, ...structure } = node;
  const { dashed, dotted, opacity, ...visual } = style ?? {};
  const source = { ...structure, ...visual, ...resolveGraphicOpacity(opacity), ...layout };

  return {
    ...source,
    position: source.position ?? NodeSchema.shape.position.parse(undefined),
    padding: resolveBoxSpacing(source.padding, DEFAULT_NODE_PADDING),
    margin: resolveBoxSpacing(source.margin, 0),
    minimumSize: expandBoxSize(source.minimumSize),
    scale: expandAxisScale(node.scale),
    text: expandNodeText(node.text),
    label: node.label,
    align: source.align ?? 'middle',
    rotate: node.rotate ?? 0,
    dashPattern: resolveDashPattern(source.dashPattern, dashed, dotted),
    shadow: resolveDropShadow(source.shadow),
  };
};

/** 节点颜色解析使用的主题模式与错误定位信息 */
type NodeColorContext = Readonly<{
  /** 当前主题明暗模式 */
  mode: NodeResolveContext['mode'];
  /** 当前节点的 IR 路径 */
  irPath: string;
}>;

/** 将数值颜色按节点主色与主题混色，字符串和绘制资源配置保持不变 */
const resolveNodePaint = (
  value: IRPaintValue | undefined,
  masterColor: string | undefined,
  context: NodeColorContext,
  field: 'fill' | 'stroke',
): Exclude<IRPaintValue, number> | undefined =>
  typeof value === 'number'
    ? resolveContextualColor(value, {
        masterColor,
        mode: context.mode,
        fieldPath: `${context.irPath}.style.${field}`,
      })
    : value;

/** 先解析节点填充、描边和文字的数值颜色，供后续自动对比色计算使用 */
const resolveNodePrimaryColors = (node: NodeLabelSource, context: NodeColorContext): NodeLabelPrimaryColorSource => {
  const { style, ...source } = node;
  const { fill, stroke, textColor, ...visual } = style ?? {};

  return {
    ...source,
    style: {
      ...visual,
      ...(fill === undefined ? {} : { fill: resolveNodePaint(fill, node.style?.color, context, 'fill') }),
      ...(stroke === undefined ? {} : { stroke: resolveNodePaint(stroke, node.style?.color, context, 'stroke') }),
      ...(textColor === undefined
        ? {}
        : {
            textColor: resolveContextualColor(textColor, {
              masterColor: node.style?.color,
              mode: context.mode,
              fieldPath: `${context.irPath}.style.textColor`,
            }),
          }),
    },
  };
};

/**
 * 合并节点默认配置并解析颜色、形状、连接面和绘制资源，得到待布局的节点
 * @description 补齐静态默认值并展开简写；位置引用、文本测量与最终尺寸由布局阶段处理
 */
export const resolveNode = (source: IRNode, context: NodeResolveContext): NodeResolution => {
  const mergedNode = mergeNodeStyle(source, context.scopeDefaults);
  const mergedLabelDefault = context.scopeDefaults.node?.label ?? {};
  const labelWasArray = Array.isArray(mergedNode.label);
  const labelsMaterialized: NodeLabelSource = {
    ...mergedNode,
    label: expandNodeLabels(mergedNode.label, mergedLabelDefault, context.labelDistance),
  };
  const primaryColorsResolved = resolveNodePrimaryColors(labelsMaterialized, context);
  const contrastResolved = resolveNodeTextColor(primaryColorsResolved, mergedLabelDefault, context.warn);
  const dependentColorsResolved = resolveNodeDependentColors(
    contrastResolved,
    mergedLabelDefault,
    context,
    labelWasArray,
  );
  const node = expandNodeFields(dependentColorsResolved);
  if (node.width !== undefined && node.width < node.minimumSize.width) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `${context.irPath}.layout.width must not be smaller than the effective minimum width`,
    );
  }

  const shape = resolveNodeShape({
    node,
    shapeRegistry: context.shapeRegistry,
    scaleX: node.scale.x,
    scaleY: node.scale.y,
    irPath: context.irPath,
  });
  const boundary = resolveNodeBoundary(node.boundary, {
    visualDef: shape.definition,
    visualParams: shape.params,
    shapeRegistry: context.shapeRegistry,
    boundaryRegistry: context.boundaryRegistry,
    irPath: context.irPath,
  });
  const fill = resolvePaint(node.fill, {
    patternRegistry: context.patternRegistry,
    round: context.round,
    irPath: context.irPath,
  });
  const stroke = resolvePaint(node.stroke, {
    patternRegistry: context.patternRegistry,
    round: context.round,
    irPath: context.irPath,
  });
  return { irPath: context.irPath, node: { ...node, fill, stroke }, shape, boundary };
};
