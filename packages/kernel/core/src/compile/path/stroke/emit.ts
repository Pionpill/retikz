import type { StrokePathResolution } from '../../../resolve';
import type { RegisterPaint } from '../../resource';
import { calculateBoundsOfPrimitives } from '../../scene';
import {
  emitStrokeArrows,
  emitStrokeLabels,
  emitStrokeMarks,
  emitInterruptedPathFragments,
  splitSubPathsForEndpointArrows,
} from './decoration';
import { wrapPathPrimitiveOutput } from './output';
import type {
  CompiledStrokeAppearance,
  CompiledStrokePath,
  PreparedStrokePathEmit,
  StrokePathCompileContext,
  StrokePathLayout,
} from './types';

/** 复用图元原子产物，应用当前宿主包装并返回已知绘制阶段 */
export const emitStrokePath = (
  resolution: StrokePathResolution,
  layout: StrokePathLayout | null,
  context: StrokePathCompileContext,
  prepared?: PreparedStrokePathEmit,
): CompiledStrokePath['emit'] => {
  if (prepared?.overall !== undefined) return { ...prepared, overall: prepared.overall };
  if (layout === null) return { ...prepared, overall: null };
  const registerPaint: RegisterPaint =
    context.options?.registerPaint ?? (paint => (typeof paint === 'string' || paint === undefined ? paint : undefined));
  const { canon } = resolution;
  /** 将已解析路径样式转换为 Scene 路径外观，并注册绘制资源 */
  let appearance: CompiledStrokeAppearance | undefined;
  const appearanceOf = (): CompiledStrokeAppearance =>
    (appearance ??= {
      stroke: registerPaint(canon.stroke) ?? 'currentColor',
      strokeWidth: canon.strokeWidth,
      fill: registerPaint(canon.fill) ?? 'none',
      fillRule: canon.fillRule === 'nonzero' ? undefined : canon.fillRule,
      dashPattern: canon.dashPattern.length === 0 ? undefined : canon.dashPattern,
      dashOffset: canon.dashOffset === 0 ? undefined : canon.dashOffset,
      lineCap: canon.lineCap === 'butt' ? undefined : canon.lineCap,
      lineJoin: canon.lineJoin === 'miter' ? undefined : canon.lineJoin,
      opacity: canon.opacity === 1 ? undefined : canon.opacity,
      fillOpacity: canon.fillOpacity === 1 ? undefined : canon.fillOpacity,
      strokeOpacity: canon.strokeOpacity === 1 ? undefined : canon.strokeOpacity,
      shadow: canon.shadow,
      blendMode: canon.blendMode === 'normal' ? undefined : canon.blendMode,
    });

  const labels = emitStrokeLabels(resolution, layout.labels, context, prepared?.labels);
  const marks = emitStrokeMarks(resolution, layout, appearanceOf, context, registerPaint, prepared?.marks);
  const arrows =
    prepared?.body === undefined
      ? emitStrokeArrows(resolution, layout, context, registerPaint, prepared?.arrows)
      : undefined;
  const body =
    prepared?.body ??
    (layout.body.kind === 'continuous'
      ? splitSubPathsForEndpointArrows(layout.body.commands, appearanceOf(), arrows!.specs)
      : emitInterruptedPathFragments(layout.body.fragments, appearanceOf(), arrows!.specs));
  const boundsPoints = [
    ...layout.geometry.boundsPoints,
    ...labels.boundsPoints,
    ...layout.marks.map(mark => mark.placement.point),
  ];
  const markBounds =
    marks.primitives.length === 0
      ? undefined
      : calculateBoundsOfPrimitives(marks.primitives, context.options?.resources?.() ?? { paints: [], clips: [] });
  if (markBounds !== undefined)
    boundsPoints.push(
      [markBounds.x, markBounds.y],
      [markBounds.x + markBounds.width, markBounds.y + markBounds.height],
    );
  const overall = wrapPathPrimitiveOutput({
    path: canon,
    primitive: body,
    bodyPrims: [body, ...marks.primitives, ...labels.primitives],
    boundsPoints,
    round: context.round,
  });
  return {
    ...prepared,
    body,
    labels: labels.slots,
    marks: marks.slots,
    ...(arrows === undefined ? {} : { arrows: arrows.slots }),
    overall,
  };
};
