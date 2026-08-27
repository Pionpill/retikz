import type { BoundsInsets } from '@retikz/math';

import type {
  IRAxisScale,
  IRBoxSize,
  IRBoxSpacing,
  IRLine,
  IRMathRun,
  IRNode,
  IRNodeLabel,
  IRPaintValue,
  IRTextRun,
} from '../../schemas';
import type { ResolvedInlineSourceRun, ResolvedLabelTextContent, ResolvedTextLine } from '../text';
import type {
  CanonicalNode,
  CanonicalNodeLabel,
  NodeResolution,
  NodeResolveContext,
  PrimaryColorResolvedNode,
  ResolvedNodeLabelPin,
  ResolvedNodeSource,
} from './types';

import { resolvePaint } from '../resource';
import { resolveContextualColor, resolveEffectiveLabelDefault, resolveEffectiveNodeStyle } from '../style';
import { resolveDashPattern, resolveDropShadow } from '../style';
import { resolveBoundaryReference } from './boundary';
import { resolveNodeShape } from './shape';
import { resolveNodeTextColor } from './text-color';

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

type MaterializedNodeLabel = Omit<IRNodeLabel, 'position' | 'placement' | 'distance'> & {
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
  labelDefault: ReturnType<typeof resolveEffectiveLabelDefault>,
  labelDistance: number,
): MaterializedNodeLabel => {
  const normalized: MaterializedNodeLabel = {
    ...label,
    position: expandNodeLabelPosition(label.position),
    placement: label.placement ?? 'outside',
    distance: label.distance ?? labelDistance,
  };
  const defaultTextColor = labelDefault.textColor ?? labelDefault.color;
  if (normalized.textColor === undefined && defaultTextColor !== undefined) normalized.textColor = defaultTextColor;
  const defaultFont = labelDefault.font;
  if (defaultFont !== undefined) {
    const font = {
      ...(defaultFont.family === undefined && normalized.font?.family === undefined
        ? {}
        : { family: normalized.font?.family ?? defaultFont.family }),
      ...(defaultFont.size === undefined && normalized.font?.size === undefined
        ? {}
        : { size: normalized.font?.size ?? defaultFont.size }),
      ...(defaultFont.weight === undefined && normalized.font?.weight === undefined
        ? {}
        : { weight: normalized.font?.weight ?? defaultFont.weight }),
      ...(defaultFont.style === undefined && normalized.font?.style === undefined
        ? {}
        : { style: normalized.font?.style ?? defaultFont.style }),
    };
    if (Object.keys(font).length > 0) normalized.font = font;
  }
  if (normalized.opacity === undefined && labelDefault.opacity !== undefined) normalized.opacity = labelDefault.opacity;
  return normalized;
};

/** 展开单标签与标签数组为等价数组写法 */
const expandNodeLabels = (
  label: IRNode['label'],
  labelDefault: ReturnType<typeof resolveEffectiveLabelDefault>,
  labelDistance: number,
): Array<MaterializedNodeLabel> | undefined =>
  label === undefined
    ? undefined
    : Array.isArray(label)
      ? label.map(item => expandNodeLabel(item, labelDefault, labelDistance))
      : [expandNodeLabel(label, labelDefault, labelDistance)];

/** 将 Node 的持久化紧凑字段展开为布局可直接消费的完整形态 */
const canonicalizeNode = (node: ResolvedNodeSource): CanonicalNode => {
  const { dashed, dotted, ...source } = node;
  return {
    ...source,
    padding: expandBoxSpacing(node.padding, DEFAULT_NODE_PADDING),
    margin: expandBoxSpacing(node.margin, 0),
    minimumSize: expandBoxSize(node.minimumSize),
    scale: expandAxisScale(node.scale),
    text: expandNodeText(node.text),
    label: node.label,
    align: node.align ?? 'middle',
    rotate: node.rotate ?? 0,
    dashPattern: resolveDashPattern(node.dashPattern, dashed, dotted),
    shadow: resolveDropShadow(node.shadow),
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
        fieldPath: `${context.irPath}.${field}`,
      })
    : value;

/** 先确定 Node 自身 fill / stroke / textColor，供 auto-contrast 消费真实背景 */
const resolveNodePrimaryColors = (
  node: MaterializedNodeSource,
  context: NodeColorContext,
): PrimaryColorResolvedMaterializedNode => {
  const { fill, stroke, textColor, ...source } = node;
  return {
    ...source,
    ...(fill === undefined ? {} : { fill: resolveNodePaint(fill, node.color, context, 'fill') }),
    ...(stroke === undefined ? {} : { stroke: resolveNodePaint(stroke, node.color, context, 'stroke') }),
    ...(textColor === undefined
      ? {}
      : {
          textColor: resolveContextualColor(textColor, {
            masterColor: node.color,
            mode: context.mode,
            fieldPath: `${context.irPath}.textColor`,
          }),
        }),
  };
};

/** 确定单个文字或公式 run 的派生颜色 */
const resolveInlineRunColor = (
  run: IRTextRun | IRMathRun,
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): ResolvedInlineSourceRun => {
  const { fill, ...source } = run;
  return {
    ...source,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode, fieldPath: `${fieldPath}.fill` }) }),
  };
};

/** 确定正文一行的 line / run 派生颜色 */
const resolveNodeLineColors = (
  line: IRLine,
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): ResolvedTextLine => {
  if (typeof line === 'string') return line;
  if ('runs' in line) {
    return {
      runs: line.runs.map((run, index) => resolveInlineRunColor(run, masterColor, mode, `${fieldPath}.runs[${index}]`)),
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

/** 确定 label 单行内容中各 run 的派生颜色 */
const resolveLabelTextColors = (
  text: IRNodeLabel['text'],
  masterColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): ResolvedLabelTextContent =>
  typeof text === 'string'
    ? text
    : {
        runs: text.runs.map((run, index) =>
          resolveInlineRunColor(run, masterColor, mode, `${fieldPath}.runs[${index}]`),
        ),
      };

/** 确定 Node label 的文字主色、run 与 pin 颜色 */
const resolveNodeLabelColors = (
  label: MaterializedNodeLabel,
  labelMasterColor: string | undefined,
  inheritedTextColor: string | undefined,
  mode: NodeResolveContext['mode'],
  fieldPath: string,
): CanonicalNodeLabel => {
  const { textColor, text, pin, ...source } = label;
  const resolvedTextColor =
    textColor === undefined
      ? inheritedTextColor
      : resolveContextualColor(textColor, {
          masterColor: labelMasterColor,
          mode,
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
            stroke: resolveContextualColor(stroke, {
              masterColor: textMaster,
              mode,
              fieldPath: `${fieldPath}.pin.stroke`,
            }),
          }),
    };
  } else {
    resolvedPin = pin;
  }
  return {
    ...source,
    ...(resolvedTextColor === undefined ? {} : { textColor: resolvedTextColor }),
    text: resolveLabelTextColors(text, textMaster, mode, `${fieldPath}.text`),
    ...(resolvedPin === undefined ? {} : { pin: resolvedPin }),
  };
};

/** 在 auto-contrast 后确定正文、label run 与 pin 的派生颜色 */
const resolveNodeDependentColors = (
  node: PrimaryColorResolvedMaterializedNode,
  labelDefault: ReturnType<typeof resolveEffectiveLabelDefault>,
  context: NodeColorContext,
  labelWasArray: boolean,
): ResolvedNodeSource => {
  const { text, label, ...source } = node;
  const textMaster = node.textColor;
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
              labelDefault.color ?? node.color,
              textMaster,
              context.mode,
              labelWasArray ? `${context.irPath}.label[${index}]` : `${context.irPath}.label`,
            ),
          ),
        }),
  };
};

/** 解析 Node 的样式、静态默认值、provider 与布局前 canonical 形态 */
export const resolveNode = (source: IRNode, context: NodeResolveContext): NodeResolution => {
  const effectiveNode = resolveEffectiveNodeStyle(source, context.styleFrames);
  const effectiveLabelDefault = resolveEffectiveLabelDefault(context.styleFrames);
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
  const node = canonicalizeNode(dependentColorsResolved);
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
  const paint = {
    ...(fill === undefined ? {} : { fill }),
    ...(stroke === undefined ? {} : { stroke }),
  };
  return { irPath: context.irPath, node, shape, boundary, paint };
};
