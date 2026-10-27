import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type {
  IRAxisScale,
  IRBoxSize,
  IRLine,
  IRMathSegment,
  IRNode,
  IRNodeLabel,
  IRPaintValue,
  IRTextSegment,
} from '../../schemas';
import { NodeSchema } from '../../schemas';
import type { IRNodeLabelDefault } from '../../schemas';
import { resolvePaint } from '../resource';
import { resolveBoxSpacing } from '../spacing';
import { resolveGraphicOpacity, mergeNodeLabelDefaults } from '../style';
import { resolveContextualColor, resolveDashPattern, resolveDropShadow, resolveEffectiveNodeStyle } from '../style';
import type { ResolvedInlineSourceSegment, ResolvedTextLine } from '../text';
import { resolveBoundaryReference } from './boundary';
import { resolveNodeShape } from './shape';
import { resolveNodeTextColor } from './text-color';
import type {
  CanonicalNode,
  CanonicalNodeLabel,
  NodeResolution,
  NodeResolveContext,
  PrimaryColorResolvedNode,
  ResolvedNodeLabelPin,
  ResolvedNodeSource,
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

/** 展开正文单字符串为单行数组 */
const expandNodeText = (text: ResolvedNodeSource['text']): CanonicalNode['text'] =>
  text === undefined ? undefined : typeof text === 'string' ? [text] : text;

/** 补齐标签位置：缺省为 top，边界位置对象缺省比例为 0.5 */
const expandNodeLabelPosition = (position: IRNodeLabel['position']): CanonicalNodeLabel['position'] => {
  if (position === undefined) return 'top';
  if (typeof position === 'object') return { ...position, fraction: position.fraction ?? 0.5 };
  return position;
};

type MaterializedNodeLabel = Omit<IRNodeLabel, 'align' | 'position' | 'placement' | 'distance'> & {
  align: CanonicalNodeLabel['align'];
  position: CanonicalNodeLabel['position'];
  placement: CanonicalNodeLabel['placement'];
  distance: number;
};

type MaterializedNodeSource = Omit<IRNode, 'label'> & {
  label?: Array<MaterializedNodeLabel>;
};

type PrimaryColorResolvedMaterializedNode = Omit<PrimaryColorResolvedNode, 'label'> & {
  label?: Array<MaterializedNodeLabel>;
};

/** 用标签默认配置补齐单个标签，并拒绝内部标签使用引线 */
const expandNodeLabel = (
  label: IRNodeLabel,
  labelDefault: IRNodeLabelDefault,
  labelDistance: number,
): MaterializedNodeLabel => {
  const { color, ...configuration } = mergeNodeLabelDefaults(labelDefault, label);
  const normalized: MaterializedNodeLabel = {
    ...configuration,
    text: label.text,
    align: configuration.align ?? 'middle',
    position: expandNodeLabelPosition(configuration.position),
    placement: configuration.placement ?? 'outside',
    distance: configuration.distance ?? labelDistance,
  };
  if (normalized.textColor === undefined && color !== undefined) normalized.textColor = color;
  if (normalized.placement === 'inside' && normalized.pin) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, 'Node label pin is only supported for outside placement');
  }

  return normalized;
};

/** 展开单标签与标签数组为等价数组写法 */
const expandNodeLabels = (
  label: IRNode['label'],
  labelDefault: IRNodeLabelDefault,
  labelDistance: number,
): Array<MaterializedNodeLabel> | undefined =>
  label === undefined
    ? undefined
    : Array.isArray(label)
      ? label.map(item => expandNodeLabel(item, labelDefault, labelDistance))
      : [expandNodeLabel(label, labelDefault, labelDistance)];

/** 展开节点简写与默认值，将样式、布局字段合入节点结果，绘制资源随后解析 */
const expandNodeFields = (
  node: ResolvedNodeSource,
): Omit<CanonicalNode, 'fill' | 'stroke'> & Pick<NonNullable<ResolvedNodeSource['style']>, 'fill' | 'stroke'> => {
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
const resolveNodePrimaryColors = (
  node: MaterializedNodeSource,
  context: NodeColorContext,
): PrimaryColorResolvedMaterializedNode => {
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

/** 解析单个文字或公式片段的数值颜色 */
const resolveInlineSegmentColor = (
  segment: IRTextSegment | IRMathSegment,
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): ResolvedInlineSourceSegment => {
  const { fill, ...source } = segment;
  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }) }),
  };
};

/** 解析正文行及其片段的数值颜色 */
const resolveNodeLineColors = (
  line: IRLine,
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): ResolvedTextLine => {
  if (typeof line === 'string') return line;
  if ('segments' in line) {
    return {
      ...line,
      fill:
        line.fill === undefined
          ? undefined
          : resolveContextualColor(line.fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }),
      segments: line.segments.map((segment, index) =>
        resolveInlineSegmentColor(segment, masterColor, mode, `${fieldPath}.segments[${index}]`),
      ),
    };
  }

  const { fill, ...source } = line;

  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }) }),
  };
};

/** 解析节点标签的文字主色、行内片段颜色与引线绘制配置 */
const resolveNodeLabelColors = (
  label: MaterializedNodeLabel,
  labelMasterColor: string | undefined,
  inheritedTextColor: string | undefined,
  context: NodeResolveContext,
  fieldPath: string,
): CanonicalNodeLabel => {
  const { textColor, text, pin, ...source } = label;
  const resolvedTextColor =
    textColor === undefined
      ? inheritedTextColor
      : resolveContextualColor(textColor, {
          masterColor: labelMasterColor,
          mode: context.mode,
          fieldPath: `${fieldPath}.textColor`,
        });
  const textMaster = resolvedTextColor ?? inheritedTextColor;
  let resolvedPin: boolean | ResolvedNodeLabelPin | undefined;
  if (typeof pin === 'object') {
    const { stroke, ...pinSource } = pin;
    resolvedPin = {
      ...pinSource,
      ...(stroke === undefined
        ? {}
        : {
            stroke: resolvePaint(
              typeof stroke === 'object'
                ? stroke
                : resolveContextualColor(stroke, {
                    masterColor: textMaster,
                    mode: context.mode,
                    fieldPath: `${fieldPath}.pin.stroke`,
                  }),
              { patterns: context.patterns, round: context.round, irPath: `${fieldPath}.pin.stroke` },
            ),
          }),
    };
  } else {
    resolvedPin = pin;
  }

  return {
    ...source,
    ...(resolvedTextColor === undefined ? {} : { textColor: resolvedTextColor }),
    text:
      typeof text === 'string'
        ? text
        : text.map((line, index) =>
            resolveNodeLineColors(line, textMaster, context.mode, `${fieldPath}.text[${index}]`),
          ),
    ...(resolvedPin === undefined ? {} : { pin: resolvedPin }),
  };
};

/** 用自动对比色计算后的文字主色，解析正文、标签片段和引线的数值颜色 */
const resolveNodeDependentColors = (
  node: PrimaryColorResolvedMaterializedNode,
  labelDefault: IRNodeLabelDefault,
  context: NodeResolveContext,
  labelWasArray: boolean,
): ResolvedNodeSource => {
  const { text, label, ...source } = node;
  const textMaster = node.style?.textColor;

  return {
    ...source,
    ...(text === undefined
      ? {}
      : {
          text:
            typeof text === 'string'
              ? text
              : text.map((line, index) =>
                  resolveNodeLineColors(line, textMaster, context.mode, `${context.irPath}.text[${index}]`),
                ),
        }),
    ...(label === undefined
      ? {}
      : {
          label: (Array.isArray(label) ? label : [label]).map((item, index) =>
            resolveNodeLabelColors(
              item,
              labelDefault.color ?? node.style?.color,
              textMaster,
              context,
              labelWasArray ? `${context.irPath}.label[${index}]` : `${context.irPath}.label`,
            ),
          ),
        }),
  };
};

/**
 * 合并节点默认配置并解析颜色、形状、连接面和绘制资源，得到待布局的节点
 * @description 补齐静态默认值并展开简写；位置引用、文本测量与最终尺寸由布局阶段处理
 */
export const resolveNode = (source: IRNode, context: NodeResolveContext): NodeResolution => {
  const effectiveNode = resolveEffectiveNodeStyle(source, context.scopeDefaults);
  const effectiveLabelDefault = context.scopeDefaults.node?.label ?? {};
  const labelWasArray = Array.isArray(effectiveNode.label);
  const labelsMaterialized: MaterializedNodeSource = {
    ...effectiveNode,
    label: expandNodeLabels(effectiveNode.label, effectiveLabelDefault, context.labelDistance),
  };
  const primaryColorsResolved = resolveNodePrimaryColors(labelsMaterialized, context);
  const contrastResolved = resolveNodeTextColor(primaryColorsResolved, effectiveLabelDefault, context.warn);
  const dependentColorsResolved = resolveNodeDependentColors(
    contrastResolved,
    effectiveLabelDefault,
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
    shapes: context.shapes,
    scaleX: node.scale.x,
    scaleY: node.scale.y,
    irPath: context.irPath,
  });
  const boundary = resolveBoundaryReference(node.boundary, {
    visualDef: shape.definition,
    visualParams: shape.params,
    shapeRegistry: context.shapes,
    boundaryRegistry: context.boundaries,
    irPath: context.irPath,
  });
  const fill = resolvePaint(node.fill, {
    patterns: context.patterns,
    round: context.round,
    irPath: context.irPath,
  });
  const stroke = resolvePaint(node.stroke, {
    patterns: context.patterns,
    round: context.round,
    irPath: context.irPath,
  });
  return { irPath: context.irPath, node: { ...node, fill, stroke }, shape, boundary };
};
