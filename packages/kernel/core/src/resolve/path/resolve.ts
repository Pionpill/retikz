import { pointAtArcAngle } from '@retikz/math';

import type { Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type {
  IRLine,
  IRMarkStyle,
  IRMathSegment,
  IRPaintValue,
  IRPathBase,
  IRPathLabel,
  IRPosition,
  IRStep,
  IRTarget,
  IRTextSegment,
} from '../../schemas';
import { BendAngleSchema, BuiltinPath, SmoothTensionSchema } from '../../schemas';
import { isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../shared';
import { resolvePaint } from '../resource';
import { resolveContextualColor, resolveDropShadow, resolveEffectivePath, resolveGraphicOpacity } from '../style';
import type { ResolvedInlineSourceSegment, ResolvedLabelTextBlock, ResolvedTextLine } from '../text';
import { resolvePathDefinition } from './provider';
import type {
  CanonicalPath,
  CanonicalPathLabel,
  CanonicalPathLabelPlacement,
  CanonicalStep,
  PathLabelGeometryOptions,
  PathResolution,
  PathResolveContext,
  PathTargetResolver,
  ResolvedMarkStyle,
  ResolvedPathLabel,
  ResolvedPathSource,
  ResolvedStepSource,
  TargetResolution,
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
const isBuiltinStrokePath = (path: ResolvedPathSource): boolean =>
  (path.kind ?? BuiltinPath.Stroke) === BuiltinPath.Stroke;

/** 判断 Path 是否没有有效填充 */
const hasNoEffectivePathFill = (path: ResolvedPathSource): boolean =>
  path.style?.fill === undefined || path.style.fill === 'none';

/** 检查标签断线配置：显式设置仅限内置 Stroke 路径，开启时要求路径无填充 */
const assertPathLabelInterruption = (label: ResolvedPathLabel, path: ResolvedPathSource, labelPath: string): void => {
  if (label.interrupt === undefined) return;
  if (!isBuiltinStrokePath(path)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Path label interruption at ${labelPath}.interrupt is only supported by an unfilled built-in Stroke path.`,
    );
  }

  if (label.interrupt && !hasNoEffectivePathFill(path)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Path label interruption at ${labelPath}.interrupt cannot be used on a filled Stroke path.`,
    );
  }
};

/** 检查路径和步骤标签是否满足断线条件 */
const assertPathLabelInterruptionPolicy = (path: ResolvedPathSource, irPath: string): void => {
  if (path.label !== undefined) {
    if (Array.isArray(path.label)) {
      for (const [index, label] of path.label.entries()) {
        assertPathLabelInterruption(label, path, `${irPath}.label[${index}]`);
      }
    } else {
      assertPathLabelInterruption(path.label, path, `${irPath}.label`);
    }
  }

  for (const [index, step] of (path.children ?? []).entries()) {
    if ('label' in step && step.label !== undefined) {
      assertPathLabelInterruption(step.label, path, `${irPath}.children[${index}].label`);
    }
  }
};

/** 检查端点箭头重叠配置是否用于内置 Stroke 路径 */
const assertPathEndpointOverlapHost = (path: ResolvedPathSource, irPath: string): void => {
  if (isBuiltinStrokePath(path)) return;

  for (const [index, placement] of Object.entries(path.arrow ?? {})) {
    if (placement.endpointOverlap === undefined) continue;

    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Path endpoint arrow overlap at ${irPath}.arrow.${index}.endpointOverlap is only supported by a built-in Stroke path.`,
    );
  }
};

/**
 * 将标签位置简写换算为比例，并补齐方向、距离和断线配置
 * @description 默认位置为 0.5，距离和断口每侧留白均为 4；未指定 side 时，随线倾斜的标签居中，其余位于上方
 * @param canAutomaticallyInterrupt 宿主是否允许自动断线；为 true 且标签居中时，缺省的 interrupt 取 true，显式值始终优先
 */
export const resolvePathLabelPlacement = (
  label: PathLabelGeometryOptions,
  canAutomaticallyInterrupt: boolean,
): CanonicalPathLabelPlacement => {
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

/** 为已解析颜色的标签补齐放置与断线默认值 */
const canonicalizeLabel = (label: ResolvedPathLabel, canAutomaticallyInterrupt: boolean): CanonicalPathLabel => ({
  ...label,
  ...resolvePathLabelPlacement(label, canAutomaticallyInterrupt),
});

/** 为路径步骤及其标签补齐静态默认值，保留目标引用供后续解析 */
const canonicalizeStep = (step: ResolvedStepSource, canAutomaticallyInterrupt: boolean): CanonicalStep => {
  if (step.kind === 'move' || step.kind === 'cycle' || step.kind === 'rectangle') return step;

  const label = step.label === undefined ? undefined : canonicalizeLabel(step.label, canAutomaticallyInterrupt);
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
  steps: ReadonlyArray<ResolvedStepSource> | undefined,
  canAutomaticallyInterrupt: boolean,
): Array<CanonicalStep> | undefined => steps?.map(step => canonicalizeStep(step, canAutomaticallyInterrupt));

/** 合入路径样式并展开步骤、标签与阴影默认值，填充和描边资源随后解析 */
const canonicalizePath = (
  path: ResolvedPathSource,
  canAutomaticallyInterrupt: boolean,
): Omit<CanonicalPath, 'fill' | 'stroke' | 'strokeWidth'> &
  Pick<NonNullable<ResolvedPathSource['style']>, 'fill' | 'stroke' | 'strokeWidth'> => {
  const { style, ...source } = path;
  const { opacity, ...visual } = style ?? {};
  return {
    ...source,
    ...visual,
    ...resolveGraphicOpacity(opacity),
    children: canonicalizeSteps(path.children, canAutomaticallyInterrupt),
    label:
      path.label === undefined
        ? undefined
        : (Array.isArray(path.label) ? path.label : [path.label]).map(label =>
            canonicalizeLabel(label, canAutomaticallyInterrupt),
          ),
    shadow: resolveDropShadow(style?.shadow),
  };
};

/** 将数值颜色按路径主色与主题混色，字符串和绘制资源配置保持不变 */
const resolvePathPaint = (
  value: IRPaintValue | undefined,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): Exclude<IRPaintValue, number> | undefined =>
  typeof value === 'number' ? resolveContextualColor(value, { masterColor, mode: context.mode, fieldPath }) : value;

/** 解析路径标签中单个文字或公式片段的数值颜色 */
const resolveLabelSegmentColor = (
  segment: IRTextSegment | IRMathSegment,
  masterColor: string | undefined,
  context: Pick<PathResolveContext, 'mode'>,
  fieldPath: string,
): ResolvedInlineSourceSegment => {
  const { fill, ...source } = segment;
  return {
    ...source,
    ...(fill === undefined
      ? {}
      : {
          fill: resolveContextualColor(fill, {
            masterColor,
            mode: context.mode,
            fieldPath: `${fieldPath}.fill`,
          }),
        }),
  };
};

/** 解析路径标签的行级与片段数值颜色 */
const resolvePathLabelTextLine = (
  text: IRLine,
  masterColor: string | undefined,
  context: Pick<PathResolveContext, 'mode'>,
  fieldPath: string,
): ResolvedTextLine => {
  if (typeof text === 'string') return text;
  if ('segments' in text) {
    return {
      ...text,
      fill:
        text.fill === undefined
          ? undefined
          : resolveContextualColor(text.fill, { masterColor, mode: context.mode, fieldPath: `${fieldPath}.fill` }),
      segments: text.segments.map((segment, index) =>
        resolveLabelSegmentColor(segment, masterColor, context, `${fieldPath}.segments[${index}]`),
      ),
    };
  }

  const { fill, ...style } = text;

  return {
    ...style,
    ...(fill === undefined
      ? {}
      : { fill: resolveContextualColor(fill, { masterColor, mode: context.mode, fieldPath: `${fieldPath}.fill` }) }),
  };
};

/** 逐行解析路径标签的数值颜色 */
const resolvePathLabelText = (
  text: IRPathLabel['text'],
  masterColor: string | undefined,
  context: Pick<PathResolveContext, 'mode'>,
  fieldPath: string,
): ResolvedLabelTextBlock =>
  Array.isArray(text)
    ? text.map((line, index) => resolvePathLabelTextLine(line, masterColor, context, `${fieldPath}[${index}]`))
    : text;

/** 确定路径标签的文字主色，并据此解析行级与片段颜色 */
export const resolvePathLabelColors = (
  label: IRPathLabel,
  masterColor: string | undefined,
  context: Pick<PathResolveContext, 'mode'>,
  fieldPath: string,
): ResolvedPathLabel => {
  const { textColor, text, ...source } = label;
  const resolvedTextColor =
    textColor === undefined
      ? masterColor
      : resolveContextualColor(textColor, {
          masterColor,
          mode: context.mode,
          fieldPath: `${fieldPath}.textColor`,
        });
  const textMaster = resolvedTextColor ?? masterColor;

  return {
    ...source,
    ...(resolvedTextColor === undefined ? {} : { textColor: resolvedTextColor }),
    text: resolvePathLabelText(text, textMaster, context, `${fieldPath}.text`),
  };
};

/** 解析路径步骤已有标签的文字与片段颜色 */
const resolveStepLabelColors = (
  step: IRStep,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedStepSource => {
  if (!('label' in step)) return step as ResolvedStepSource;

  const { label, ...source } = step;
  if (label === undefined) return source;

  return {
    ...source,
    label: resolvePathLabelColors(label, masterColor, context, `${fieldPath}.label`),
  };
};

/** 解析标记主色及依赖它的填充、描边颜色 */
const resolveMarkColors = (
  mark: IRMarkStyle,
  masterColor: string | undefined,
  context: PathResolveContext,
  fieldPath: string,
): ResolvedMarkStyle => {
  const { color, fill, stroke, ...source } = mark;
  const resolvedColor =
    color === undefined
      ? masterColor
      : resolveContextualColor(color, {
          masterColor,
          mode: context.mode,
          fieldPath: `${fieldPath}.color`,
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
                  fieldPath: `${fieldPath}.stroke`,
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
                  fieldPath: `${fieldPath}.fill`,
                }),
        }),
  };
};

/** 解析路径、标签、箭头及沿线标记中的数值颜色 */
const resolvePathContextualColors = (
  path: IRPathBase,
  context: PathResolveContext,
  irPath: string,
  labelMasterColor: string | undefined,
): ResolvedPathSource => {
  const { style, children, label, marks, arrow, ...source } = path;
  const { fill, stroke, ...visual } = style ?? {};
  const masterColor = path.style?.color;
  const resolvedHostLabel =
    label === undefined
      ? undefined
      : Array.isArray(label)
        ? label.map((item, index) =>
            resolvePathLabelColors(item, labelMasterColor, context, `${irPath}.label[${index}]`),
          )
        : resolvePathLabelColors(label, labelMasterColor, context, `${irPath}.label`);

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
                    ...resolveMarkColors(arrow.start, masterColor, context, `${irPath}.arrow.start`),
                    endpointOverlap: arrow.start.endpointOverlap,
                  },
                }),
            ...(arrow.end === undefined
              ? {}
              : {
                  end: {
                    ...resolveMarkColors(arrow.end, masterColor, context, `${irPath}.arrow.end`),
                    endpointOverlap: arrow.end.endpointOverlap,
                  },
                }),
          },
        }),
    style: {
      ...visual,
      ...(fill === undefined ? {} : { fill: resolvePathPaint(fill, masterColor, context, `${irPath}.style.fill`) }),
      ...(stroke === undefined && masterColor === undefined
        ? {}
        : { stroke: resolvePathPaint(stroke ?? masterColor, masterColor, context, `${irPath}.style.stroke`) }),
    },
    ...(children === undefined
      ? {}
      : {
          children: children.map((step, index) =>
            resolveStepLabelColors(step, labelMasterColor, context, `${irPath}.children[${index}]`),
          ),
        }),
    ...(resolvedHostLabel === undefined ? {} : { label: resolvedHostLabel }),
    ...(marks === undefined
      ? {}
      : {
          marks: marks.map((item, index) => ({
            ...resolveMarkColors(item, masterColor, context, `${irPath}.marks[${index}]`),
            pos: item.pos,
            rotate: item.rotate,
          })),
        }),
  };
};

/** 通过调用方提供的解析器读取目标的局部坐标，无法解析时返回 null */
const pointOfTarget = (
  target: IRTarget,
  resolver: PathTargetResolver | undefined,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition | null => resolver?.pointOfTarget(target, scopeChain) ?? null;

/** 优先获取目标的完整绑定；未提供绑定时读取坐标，参考点缺省时沿用局部点 */
const bindTarget = (
  target: IRTarget,
  context: PathResolveContext,
  scopeChain: ReadonlyArray<Transform>,
): TargetResolution => {
  const bound = context.targetResolver?.bindTarget?.(target, scopeChain);
  if (bound !== null && bound !== undefined) return bound;

  const point = pointOfTarget(target, context.targetResolver, scopeChain);
  const referencePoint = context.targetResolver?.refPointOfTarget?.(target, scopeChain) ?? point;

  return { target, point, referencePoint };
};

/**
 * 解析路径步骤中可确定的目标坐标，并按字段路径登记绑定结果
 * @description 普通相对目标不更新后续偏移的基点，累积相对目标会更新；经过轴向线或平滑步骤后，后续相对目标保留给编译游标处理
 */
const resolveSteps = (
  steps: ReadonlyArray<CanonicalStep>,
  context: PathResolveContext,
  targets: Map<string, TargetResolution>,
  prefix: string,
): Array<CanonicalStep> => {
  const resolver = context.targetResolver;
  const scopeChain = context.scopeChain ?? [];
  let previous: IRPosition | null = null;
  let deferRelative = false;
  const out: Array<CanonicalStep> = [];

  const resolve = (target: IRTarget, key: string): IRTarget => {
    let value = target;
    if (isRelativeTargetLike(target) && !deferRelative) {
      const base = previous ?? [0, 0];
      value = [base[0] + target.relative[0], base[1] + target.relative[1]];
    } else if (isRelativeAccumulateTargetLike(target) && !deferRelative) {
      const base = previous ?? [0, 0];
      value = [base[0] + target.relativeAccumulate[0], base[1] + target.relativeAccumulate[1]];
    }

    targets.set(key, bindTarget(value, context, scopeChain));

    return value;
  };

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.kind === 'cycle' || step.kind === 'circlePath' || step.kind === 'ellipsePath') {
      out.push(step);
      continue;
    }

    if (step.kind === 'axis-line') {
      deferRelative = true;
      const value = resolve(step.to, `${prefix}.children[${index}].to`) as typeof step.to;
      out.push({ ...step, to: value });
      continue;
    }

    if (step.kind === 'arc') {
      const center =
        step.center === undefined ? undefined : resolve(step.center, `${prefix}.children[${index}].center`);
      out.push(center === undefined ? step : { ...step, center });
      if (previous && typeof step.radius === 'number' && step.center === undefined) {
        previous = pointAtArcAngle(previous, step.radius, step.endAngle);
      }
      continue;
    }

    if (step.kind === 'smooth') {
      let smoothPrevious: IRPosition | null = previous;
      const points = step.points.map((target, pointIndex) => {
        const key = `${prefix}.children[${index}].points[${pointIndex}]`;
        let value: IRTarget = target;
        if (isRelativeTargetLike(target) && !deferRelative) {
          const base = smoothPrevious ?? [0, 0];
          value = [base[0] + target.relative[0], base[1] + target.relative[1]];
        } else if (isRelativeAccumulateTargetLike(target) && !deferRelative) {
          const base = smoothPrevious ?? [0, 0];
          value = [base[0] + target.relativeAccumulate[0], base[1] + target.relativeAccumulate[1]];
        }

        const binding = bindTarget(value, context, scopeChain);
        targets.set(key, binding);
        const point = binding.point;
        if (point && !isRelativeTargetLike(target)) smoothPrevious = point;
        if (point && isRelativeAccumulateTargetLike(target)) smoothPrevious = point;

        return value;
      });
      previous = smoothPrevious;
      deferRelative = true;
      out.push({ ...step, points });
      continue;
    }

    if (step.kind === 'rectangle') {
      const from = resolve(step.from, `${prefix}.children[${index}].from`);
      const to = resolve(step.to, `${prefix}.children[${index}].to`);
      out.push({ ...step, from, to });
      continue;
    }

    const value = resolve(step.to, `${prefix}.children[${index}].to`);
    out.push({ ...step, to: value });
    if (!isRelativeTargetLike(step.to)) {
      const point = pointOfTarget(value, resolver, scopeChain);
      if (point) previous = point;
    }
  }

  return out;
};

/**
 * 解析路径默认配置、定义、颜色和目标引用，得到待编译的路径
 * @description 补齐静态默认值并绑定可确定的目标；箭头与沿线标记定义在实际编译 Stroke 时另行解析
 */
export const resolvePath = (path: IRPathBase, context: PathResolveContext): PathResolution => {
  const styled = context.scopeDefaults === undefined ? path : resolveEffectivePath(path, context.scopeDefaults);
  const irPath = context.irPath ?? 'path';
  const labelDefault = context.scopeDefaults?.path?.label ?? {};
  const labelMasterColor = labelDefault.color ?? styled.style?.color;
  const colorsResolved = resolvePathContextualColors(styled, context, irPath, labelMasterColor);
  const canAutomaticallyInterrupt = isBuiltinStrokePath(colorsResolved) && hasNoEffectivePathFill(colorsResolved);
  assertPathEndpointOverlapHost(colorsResolved, irPath);
  assertPathLabelInterruptionPolicy(colorsResolved, irPath);
  const kind = resolvePathDefinition(colorsResolved, context, irPath);
  const providerColorsResolved = resolvePathContextualColors(kind.path, context, irPath, labelMasterColor);
  const canonicalPath = canonicalizePath(providerColorsResolved, canAutomaticallyInterrupt);
  const targets = new Map<string, TargetResolution>();
  const canonicalSteps =
    canonicalPath.children === undefined ? undefined : resolveSteps(canonicalPath.children, context, targets, irPath);
  const resolvedPath: ReturnType<typeof canonicalizePath> = {
    ...canonicalPath,
    ...(canonicalSteps === undefined ? {} : { children: canonicalSteps }),
  };
  const paintContext = {
    patterns: context.patterns,
    round: context.round,
    irPath,
  };
  const fill = resolvePaint(resolvedPath.fill, paintContext);
  const stroke = resolvePaint(resolvedPath.stroke, paintContext);

  return {
    irPath,
    path: { ...resolvedPath, fill, stroke, strokeWidth: resolvedPath.strokeWidth ?? 1 },
    targets,
    kind,
  };
};
