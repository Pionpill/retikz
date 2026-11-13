import type { CurveSegmentSample } from '@retikz/math';

import type { PathDefinitionLabel, ScenePrimitive } from '../../../../contract';
import type { StrokePathResolution } from '../../../../resolve';
import type { IRPosition } from '../../../../schemas';
import { fallbackMeasurer } from '../../../text';
import { emitPathLabelContent, measurePathLabel, placePathLabel, placePathLabelContent } from '../../label';
import type { StrokePositionModel, StrokeLabelSample } from '../geometry';
import { sampleStrokePosition } from '../geometry';
import type {
  PreparedStrokeLabelLayout,
  PreparedStrokeLabelEmit,
  StrokeLabelSlots,
  StrokePathCompileContext,
} from '../types';

/** 按当前声明计算标签测量与放置，几何记录不保存旧标签 */
export const layoutStrokeLabels = (
  resolution: StrokePathResolution,
  positions: StrokePositionModel | undefined,
  context: StrokePathCompileContext,
  prepared?: StrokeLabelSlots<PreparedStrokeLabelLayout>,
): Required<StrokeLabelSlots<PreparedStrokeLabelLayout>> => {
  const { canon: path, irPath } = resolution;
  const labelContext = {
    round: context.round,
    measureText: context.measureText ?? fallbackMeasurer,
    tex: {
      lowerTex: context.options?.lowerTex,
      warn: (code: string, message: string) => context.options?.onWarn?.({ code, message, path: [...irPath, 'label'] }),
    },
  };
  const layoutLabel = (
    label: PathDefinitionLabel,
    cached: PreparedStrokeLabelLayout | undefined,
    locate: () => { visual?: CurveSegmentSample; logical?: StrokeLabelSample },
  ): PreparedStrokeLabelLayout => {
    if (cached?.placement === null) return cached;
    const located = cached?.placement === undefined ? locate() : undefined;
    if (cached?.placement === undefined && located?.visual === undefined) return { ...cached, placement: null };
    const measurement = cached?.measurement ?? measurePathLabel(label, labelContext);
    const placement = cached?.placement ?? {
      ...placePathLabel(label, located!.visual!, measurement, labelContext),
      logicalSample: located?.logical,
    };
    return { measurement, placement };
  };
  return {
    steps: (path.children ?? []).map((step, index) => {
      if (
        step.kind === 'move' ||
        step.kind === 'cycle' ||
        step.kind === 'rectangle' ||
        !('label' in step) ||
        step.label === undefined
      )
        return {};
      const label = step.label;
      return layoutLabel(label, prepared?.steps?.[index], () =>
        positions === undefined
          ? {}
          : (sampleStrokePosition(positions, label.position, label.positionMode, label.positionGeometry, index) ?? {}),
      );
    }),
    host: (path.label ?? []).map((label, index) =>
      layoutLabel(label, prepared?.host?.[index], () =>
        positions === undefined
          ? {}
          : (sampleStrokePosition(positions, label.position, label.positionMode, label.positionGeometry) ?? {}),
      ),
    ),
  };
};

/** 保持普通步骤、断线步骤、宿主标签的绘制顺序，源槽位仍按声明编号 */
export const visitStrokeLabels = <TLabel>(
  resolution: StrokePathResolution,
  slots: StrokeLabelSlots<TLabel>,
  visit: (label: PathDefinitionLabel, slot: TLabel | undefined, kind: 'steps' | 'host', index: number) => void,
): void => {
  for (const interrupt of [false, true])
    for (const [index, step] of (resolution.canon.children ?? []).entries())
      if (
        step.kind !== 'move' &&
        step.kind !== 'cycle' &&
        step.kind !== 'rectangle' &&
        'label' in step &&
        step.label !== undefined &&
        step.label.interrupt === interrupt
      )
        visit(step.label, slots.steps?.[index], 'steps', index);
  for (const [index, label] of (resolution.canon.label ?? []).entries())
    visit(label, slots.host?.[index], 'host', index);
};

/** 使用局部内容或已放置图元，补齐本次标签绘制 */
export const emitStrokeLabels = (
  resolution: StrokePathResolution,
  layouts: Required<StrokeLabelSlots<PreparedStrokeLabelLayout>>,
  context: StrokePathCompileContext,
  prepared?: StrokeLabelSlots<PreparedStrokeLabelEmit>,
) => {
  const slots: Required<StrokeLabelSlots<PreparedStrokeLabelEmit>> = {
    steps: layouts.steps.map(() => ({})),
    host: layouts.host.map(() => ({})),
  };
  const primitives: Array<ScenePrimitive> = [];
  const boundsPoints: Array<IRPosition> = [];
  visitStrokeLabels(resolution, layouts, (label, layout, kind, index) => {
    const cached = prepared?.[kind]?.[index];
    if (layout?.placement == null) {
      slots[kind][index] = { ...cached, overall: null };
      return;
    }
    const content =
      cached?.content ??
      (cached?.overall === undefined
        ? emitPathLabelContent(label, layout.measurement!, resolution.canon.opacity)
        : undefined);
    const overall =
      cached?.overall !== undefined ? cached.overall : placePathLabelContent(content!, layout.placement, context.round);
    slots[kind][index] = { ...cached, ...(content === undefined ? {} : { content }), overall };
    if (overall !== null) primitives.push(overall);
    boundsPoints.push(...layout.placement.boundsPoints);
  });
  return { slots, primitives, boundsPoints };
};
