import type { BoundsInsets } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type {
  IRAxisScale,
  IRBoxSize,
  IRBoxSpacing,
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

/** Node 缺省内边距 */
const DEFAULT_NODE_PADDING = 8;

/** 将单值构造成完整四边间距 */
const boxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

/** 展开 Node 的单值或 CSS-like 四边间距 */
const expandBoxSpacing = (value: number | IRBoxSpacing | undefined, fallback: number): BoundsInsets => {
  if (typeof value === 'number') return boxInsets(value);

  const base = value?.default ?? fallback;

  return {
    top: value?.top ?? value?.y ?? base,
    right: value?.right ?? value?.x ?? base,
    bottom: value?.bottom ?? value?.y ?? base,
    left: value?.left ?? value?.x ?? base,
  };
};

/** 展开 Node 的单值或轴向缩放 */
const expandAxisScale = (value: number | IRAxisScale | undefined): CanonicalNode['scale'] => {
  if (typeof value === 'number') return { x: value, y: value };

  const base = value?.default ?? 1;

  return {
    x: value?.x ?? base,
    y: value?.y ?? base,
  };
};

/** 展开 Node 的单值或宽高最小尺寸 */
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

/** 展开标签边界位置的比例缺省值 */
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

/** 按有效 labelDefault 补齐一个标签，并保留显式字段优先级 */
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

/** 展开 Node 的紧凑字段与默认值，paint 随后绑定到具体能力 */
const expandNodeFields = (
  node: ResolvedNodeSource,
): Omit<CanonicalNode, 'fill' | 'stroke'> & Pick<NonNullable<ResolvedNodeSource['style']>, 'fill' | 'stroke'> => {
  const { style, layout, ...structure } = node;
  const { dashed, dotted, opacity, ...visual } = style ?? {};
  const source = { ...structure, ...visual, ...resolveGraphicOpacity(opacity), ...layout };

  return {
    ...source,
    position: source.position ?? NodeSchema.shape.position.parse(undefined),
    padding: expandBoxSpacing(source.padding, DEFAULT_NODE_PADDING),
    margin: expandBoxSpacing(source.margin, 0),
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

type NodeColorContext = Readonly<{
  mode: NodeResolveContext['mode'];
  irPath: string;
}>;

/** 将 contextual paint 的 number 分支确定为字符串，paint object 保持不变 */
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

/** 先确定 Node 自身 fill / stroke / textColor，供 auto-contrast 消费真实背景 */
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

/** 确定单个文字或公式 segment 的派生颜色 */
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

/** 确定正文一行的 line / segment 派生颜色 */
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

/** 确定 Node label 的文字主色、segment 与 pin 颜色 */
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

/** 在 auto-contrast 后确定正文、label segment 与 pin 的派生颜色 */
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

/** 解析 Node 的样式、静态默认值、provider 与布局前 canonical 形态 */
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
