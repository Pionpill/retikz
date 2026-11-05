import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRMarkStyle, IRPaintValue, IRPathBase, IRPathLabel, IRStep } from '../../schemas';
import { BendAngleSchema, BuiltinPath, SmoothTensionSchema } from '../../schemas';
import { resolvePaint } from '../resource';
import { mergePathStyle, resolveContextualColor, resolveDropShadow, resolveGraphicOpacity } from '../style';
import { resolveTextBlock, resolveTextLineColors } from '../text';
import type { LabelTextColorSource } from '../text';
import { resolvePathDefinition, resolveStrokePathProviders } from './provider';
import type {
  CanonicalPathProperties,
  CanonicalPathLabel,
  CanonicalPathLabelPlacement,
  CanonicalPathStep,
  MarkColorSource,
  PathColorSource,
  PathLabelColorSource,
  PathLabelGeometryOptions,
  CanonicalPath,
  PathResolveContext,
  StepColorSource,
} from './types';

const LABEL_POSITION: Record<string, number> = {
  'at-start': 0,
  'very-near-start': 0.125,
  'near-start': 0.25,
  midway: 0.5,
  'near-end': 0.75,
  'very-near-end': 0.875,
  'at-end': 1,
};

/** 判断 Path 是否为内置 Stroke 宿主 */
const isBuiltinStrokePath = (path: PathColorSource): boolean =>
  (path.kind ?? BuiltinPath.Stroke) === BuiltinPath.Stroke;

/** 判断 Path 是否没有有效填充 */
const hasNoEffectivePathFill = (path: PathColorSource): boolean =>
  path.style?.fill === undefined || path.style.fill === 'none';

/** 检查标签断线配置：显式设置仅限内置 Stroke 路径，开启时要求路径无填充 */
const assertPathLabelInterruption = (
  label: PathLabelColorSource,
  path: PathColorSource,
  labelPath: PropertyPath,
): void => {
  if (label.interrupt === undefined) return;
  if (!isBuiltinStrokePath(path)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Path label interruption at ${formatPropertyPath(labelPath)}.interrupt is only supported by an unfilled built-in Stroke path.`,
    );
  }

  if (label.interrupt && !hasNoEffectivePathFill(path)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Path label interruption at ${formatPropertyPath(labelPath)}.interrupt cannot be used on a filled Stroke path.`,
    );
  }
};

/** 检查路径和步骤标签是否满足断线条件 */
const assertPathLabelInterruptionPolicy = (path: PathColorSource, irPath: PropertyPath): void => {
  if (path.label !== undefined) {
    if (Array.isArray(path.label)) {
      for (const [index, label] of path.label.entries()) {
        assertPathLabelInterruption(label, path, [...irPath, 'label', index]);
      }
    } else {
      assertPathLabelInterruption(path.label, path, [...irPath, 'label']);
    }
  }

  for (const [index, step] of (path.children ?? []).entries()) {
    if ('label' in step && step.label !== undefined) {
      assertPathLabelInterruption(step.label, path, [...irPath, 'children', index, 'label']);
    }
  }
};

/** 检查端点箭头重叠配置是否用于内置 Stroke 路径 */
const assertPathEndpointOverlapHost = (path: PathColorSource, irPath: PropertyPath): void => {
  if (isBuiltinStrokePath(path)) return;

  for (const [index, placement] of Object.entries(path.arrow ?? {})) {
    if (placement.endpointOverlap === undefined) continue;

    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Path endpoint arrow overlap at ${formatPropertyPath(irPath)}.arrow.${index}.endpointOverlap is only supported by a built-in Stroke path.`,
    );
  }
};

/** 一次复制补齐标签几何字段，并保留调用方携带的文本与外观类型 */
const canonicalizeLabelPlacement = <TLabel extends PathLabelGeometryOptions>(
  label: TLabel,
  canAutomaticallyInterrupt: boolean,
): Omit<TLabel, 'position' | 'side' | 'distance' | 'interrupt' | 'gap'> & CanonicalPathLabelPlacement => {
  const side = label.side ?? (label.sloped === true ? 'center' : 'top');
  return {
    ...label,
    position:
      label.position === undefined
        ? 0.5
        : typeof label.position === 'number'
          ? label.position
          : (LABEL_POSITION[label.position] ?? 0.5),
    side,
    distance: label.distance ?? 4,
    interrupt: label.interrupt ?? (canAutomaticallyInterrupt && side === 'center'),
    gap: label.gap ?? 4,
  };
};

/**
 * 将标签位置简写换算为比例，并补齐方向、距离和断线配置
 * @description 默认位置为 0.5，距离和断口每侧留白均为 4；未指定 side 时，随线倾斜的标签居中，其余位于上方
 * @param canAutomaticallyInterrupt 宿主是否允许自动断线；为 true 且标签居中时，缺省的 interrupt 取 true，显式值始终优先
 */
export const resolvePathLabelPlacement = (
  label: PathLabelGeometryOptions,
  canAutomaticallyInterrupt: boolean,
): CanonicalPathLabelPlacement => canonicalizeLabelPlacement(label, canAutomaticallyInterrupt);

/** 为已解析颜色的标签补齐放置与断线默认值 */
export const resolvePathLabelContent = (
  label: PathLabelColorSource,
  canAutomaticallyInterrupt: boolean,
  context: Pick<PathResolveContext, 'rootFontSize' | 'gatingOn' | 'warn'>,
): CanonicalPathLabel => {
  const { text, font, textColor, textAlign, lineHeight, maxTextWidth, ...host } = label;
  return {
    ...canonicalizeLabelPlacement(host, canAutomaticallyInterrupt),
    text: resolveTextBlock(
      { text, font, textColor, textAlign, lineHeight, maxTextWidth },
      {
        ...context,
        inheritedFont: { size: context.rootFontSize },
      },
    ),
  };
};

/** 为路径步骤及其标签补齐静态默认值，保留目标引用供后续解析 */
const canonicalizeStep = (
  step: StepColorSource,
  canAutomaticallyInterrupt: boolean,
  context: PathResolveContext,
): CanonicalPathStep => {
  if (step.kind === 'move' || step.kind === 'cycle' || step.kind === 'rectangle') return step;

  const label =
    step.label === undefined ? undefined : resolvePathLabelContent(step.label, canAutomaticallyInterrupt, context);
  if (step.kind === 'fold') {
    switch (step.via) {
      case '-|-':
      case '|-|':
        return { ...step, label, fraction: step.fraction ?? 0.5 };
      case '-|':
      case '|-':
        return { ...step, label };
    }
  }

  if (step.kind === 'smooth') return { ...step, label, tension: step.tension ?? SmoothTensionSchema.parse(undefined) };
  if (step.kind === 'bend') {
    return {
      ...step,
      label,
      bendDirection: step.bendDirection ?? 'left',
      bendAngle: step.bendAngle ?? BendAngleSchema.parse(undefined),
    };
  }

  if (step.kind === 'circlePath' || step.kind === 'ellipsePath') {
    return { ...step, label, closed: step.closed ?? 'chord' };
  }

  return { ...step, label };
};

/** 按原顺序补齐每个路径步骤的默认值 */
const canonicalizeSteps = (
  steps: ReadonlyArray<StepColorSource> | undefined,
  canAutomaticallyInterrupt: boolean,
  context: PathResolveContext,
): Array<CanonicalPathStep> | undefined =>
  steps?.map(step => canonicalizeStep(step, canAutomaticallyInterrupt, context));

/** 合入路径样式并展开步骤、标签与阴影默认值，填充和描边资源随后解析 */
const canonicalizePath = (
  path: PathColorSource,
  canAutomaticallyInterrupt: boolean,
  context: PathResolveContext,
): Omit<CanonicalPathProperties, 'fill' | 'stroke' | 'strokeWidth'> &
  Pick<NonNullable<PathColorSource['style']>, 'fill' | 'stroke' | 'strokeWidth'> => {
  const { style, ...source } = path;
  const { children, label: pathLabel } = source;
  const { opacity, ...visual } = style ?? {};
  return {
    ...source,
    ...visual,
    kind: source.kind ?? BuiltinPath.Stroke,
    fillRule: visual.fillRule ?? 'nonzero',
    dashPattern: visual.dashPattern ?? [],
    dashOffset: visual.dashOffset ?? 0,
    lineCap: visual.lineCap ?? 'butt',
    lineJoin: visual.lineJoin ?? 'miter',
    blendMode: visual.blendMode ?? 'normal',
    strokeEnabled: visual.stroke !== undefined || visual.strokeWidth !== undefined,
    opacity: 1,
    fillOpacity: 1,
    strokeOpacity: 1,
    ...resolveGraphicOpacity(opacity),
    children: canonicalizeSteps(children, canAutomaticallyInterrupt, context),
    label:
      pathLabel === undefined
        ? undefined
        : (Array.isArray(pathLabel) ? pathLabel : [pathLabel]).map(label =>
            resolvePathLabelContent(label, canAutomaticallyInterrupt, context),
          ),
    shadow: resolveDropShadow(style?.shadow),
  };
};

/** 将数值颜色按路径主色与主题混色，字符串和绘制资源配置保持不变 */
const resolvePathPaint = (
  value: IRPaintValue | undefined,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: PropertyPath,
): Exclude<IRPaintValue, number> | undefined =>
  typeof value === 'number' ? resolveContextualColor(value, { masterColor, mode: context.mode, fieldPath }) : value;

/** 逐行解析路径标签的数值颜色 */
const resolvePathLabelText = (
  text: IRPathLabel['text'],
  masterColor: string | undefined,
  mode: PathResolveContext['mode'],
  fieldPath: PropertyPath,
): LabelTextColorSource =>
  Array.isArray(text)
    ? text.map((line, index) => resolveTextLineColors(line, masterColor, mode, [...fieldPath, index]))
    : text;

/** 确定路径标签的文字主色，并据此解析行级与片段颜色 */
export const resolvePathLabelColors = (
  label: IRPathLabel,
  masterColor: string | undefined,
  mode: PathResolveContext['mode'],
  fieldPath: PropertyPath,
): PathLabelColorSource => {
  const { textColor, text, ...source } = label;
  const resolvedTextColor =
    textColor === undefined
      ? masterColor
      : resolveContextualColor(textColor, {
          masterColor,
          mode,
          fieldPath: [...fieldPath, 'textColor'],
        });
  const textMaster = resolvedTextColor ?? masterColor;

  return {
    ...source,
    ...(resolvedTextColor === undefined ? {} : { textColor: resolvedTextColor }),
    text: resolvePathLabelText(text, textMaster, mode, [...fieldPath, 'text']),
  };
};

/** 解析路径步骤已有标签的文字与片段颜色 */
const resolveStepLabelColors = (
  step: IRStep,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: PropertyPath,
): StepColorSource => {
  if (!('label' in step)) return step as StepColorSource;

  const { label, ...source } = step;
  if (label === undefined) return source;

  return {
    ...source,
    label: resolvePathLabelColors(label, masterColor, context.mode, [...fieldPath, 'label']),
  };
};

/** 解析标记主色及依赖它的填充、描边颜色 */
const resolveMarkColors = (
  mark: IRMarkStyle,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: PropertyPath,
): MarkColorSource => {
  const { color, fill, stroke, ...source } = mark;
  const resolvedColor =
    color === undefined
      ? masterColor
      : resolveContextualColor(color, {
          masterColor,
          mode: context.mode,
          fieldPath: [...fieldPath, 'color'],
        });

  return {
    ...source,
    ...(stroke === undefined
      ? {}
      : {
          stroke:
            typeof stroke === 'object'
              ? stroke
              : resolveContextualColor(stroke, {
                  masterColor: resolvedColor,
                  mode: context.mode,
                  fieldPath: [...fieldPath, 'stroke'],
                }),
        }),
    ...(resolvedColor === undefined ? {} : { color: resolvedColor }),
    ...(fill === undefined
      ? {}
      : {
          fill:
            typeof fill === 'object'
              ? fill
              : resolveContextualColor(fill, {
                  masterColor: resolvedColor,
                  mode: context.mode,
                  fieldPath: [...fieldPath, 'fill'],
                }),
        }),
  };
};

/** 解析路径、标签、箭头及沿线标记中的数值颜色 */
const resolvePathContextualColors = (
  path: IRPathBase,
  context: PathResolveContext,
  irPath: PropertyPath,
  labelMasterColor: string | undefined,
): PathColorSource => {
  const { style, children, label, marks, arrow, ...source } = path;
  const { fill, stroke, ...visual } = style ?? {};
  const masterColor = style?.color;
  const resolvedHostLabel =
    label === undefined
      ? undefined
      : Array.isArray(label)
        ? label.map((item, index) =>
            resolvePathLabelColors(item, labelMasterColor, context.mode, [...irPath, 'label', index]),
          )
        : resolvePathLabelColors(label, labelMasterColor, context.mode, [...irPath, 'label']);

  return {
    ...source,
    ...(arrow === undefined
      ? {}
      : {
          arrow: {
            ...(arrow.start === undefined
              ? {}
              : {
                  start: {
                    ...resolveMarkColors(arrow.start, masterColor, context, [...irPath, 'arrow', 'start']),
                    endpointOverlap: arrow.start.endpointOverlap,
                  },
                }),
            ...(arrow.end === undefined
              ? {}
              : {
                  end: {
                    ...resolveMarkColors(arrow.end, masterColor, context, [...irPath, 'arrow', 'end']),
                    endpointOverlap: arrow.end.endpointOverlap,
                  },
                }),
          },
        }),
    style: {
      ...visual,
      ...(fill === undefined
        ? {}
        : { fill: resolvePathPaint(fill, masterColor, context, [...irPath, 'style', 'fill']) }),
      ...(stroke === undefined && masterColor === undefined
        ? {}
        : { stroke: resolvePathPaint(stroke ?? masterColor, masterColor, context, [...irPath, 'style', 'stroke']) }),
    },
    ...(children === undefined
      ? {}
      : {
          children: children.map((step, index) =>
            resolveStepLabelColors(step, labelMasterColor, context, [...irPath, 'children', index]),
          ),
        }),
    ...(resolvedHostLabel === undefined ? {} : { label: resolvedHostLabel }),
    ...(marks === undefined
      ? {}
      : {
          marks: marks.map((item, index) => ({
            ...resolveMarkColors(item, masterColor, context, [...irPath, 'marks', index]),
            pos: item.pos,
            rotate: item.rotate,
          })),
        }),
  };
};

/**
 * 解析路径默认配置、定义与颜色，得到待绑定目标的路径
 * @description 补齐静态默认值与绘制配置，内置 Stroke 同时绑定箭头与标记；自定义路径仅在请求描边能力时绑定
 */
export const resolvePath = (path: IRPathBase, context: PathResolveContext): CanonicalPath => {
  const styled = context.scopeDefaults === undefined ? path : mergePathStyle(path, context.scopeDefaults);
  const irPath = context.irPath ?? [];
  const labelDefault = context.scopeDefaults?.path?.label ?? {};
  const labelMasterColor = labelDefault.color ?? styled.style?.color;
  const colorsResolved = resolvePathContextualColors(styled, context, irPath, labelMasterColor);
  const canAutomaticallyInterrupt = isBuiltinStrokePath(colorsResolved) && hasNoEffectivePathFill(colorsResolved);
  assertPathEndpointOverlapHost(colorsResolved, irPath);
  assertPathLabelInterruptionPolicy(colorsResolved, irPath);
  const pathDefinition = resolvePathDefinition(colorsResolved, context, irPath);
  const providerColorsResolved = resolvePathContextualColors(pathDefinition.path, context, irPath, labelMasterColor);
  const canonicalPath = canonicalizePath(providerColorsResolved, canAutomaticallyInterrupt, context);
  const paintContext = {
    patternRegistry: context.patternRegistry,
    round: context.round,
    irPath,
  };
  const fill = resolvePaint(canonicalPath.fill, paintContext);
  const stroke = resolvePaint(canonicalPath.stroke, paintContext);

  const result: CanonicalPath = {
    irPath,
    properties: {
      ...canonicalPath,
      kind: pathDefinition.kind,
      fill,
      stroke,
      strokeWidth: canonicalPath.strokeWidth ?? 1,
    },
    definition: pathDefinition.definition,
  };
  if (pathDefinition.kind !== BuiltinPath.Stroke) return result;
  const resolvedStroke = resolveStrokePathProviders(result, context);
  return {
    ...result,
    properties: resolvedStroke.properties,
    stroke: { arrows: resolvedStroke.arrows, marks: resolvedStroke.marks },
  };
};
