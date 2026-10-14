import type { BoundsInsets } from '@retikz/math';

import { RetikzPlotError } from '../../../../error';
import type { PlotLabelMeasure } from '../../../../shared';
import { DEFAULT_AXIS_LABEL_GAP, DEFAULT_AXIS_TICK_LENGTH } from '../../../../shared';
import type { PolarAngularLabel, PolarAngularLabelLayout, PolarLayout, PolarLayoutContext } from './types';

/** 极坐标方向分量视为轴向的误差阈值 */
const POLAR_AXIS_EPSILON = 1e-9;

/** 将方向分量归为负向、轴向或正向 */
const polarDirectionSign = (component: number): -1 | 0 | 1 => {
  if (Math.abs(component) <= POLAR_AXIS_EPSILON) return 0;
  return component < 0 ? -1 : 1;
};

/** 标签矩形沿给定径向单位向量的支撑距离 */
const polarLabelRadialSupport = (horizontal: number, vertical: number, width: number, height: number): number =>
  Math.abs(horizontal) * (width / 2) + Math.abs(vertical) * (height / 2);

/**
 * 把角向标签的视觉盒放到外圈锚点之外
 * @description 标签中心沿径向连续外移其矩形支撑距离，使视觉盒内侧与 tick + gap 锚点相切
 */
export const layoutPolarAngularLabel = (
  center: readonly [number, number],
  outerRadius: number,
  label: PolarAngularLabel,
  fontSize: number,
  radialOffset = DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP,
  measure: PlotLabelMeasure,
): PolarAngularLabelLayout => {
  const radians = (label.angle * Math.PI) / 180;
  const horizontal = Math.cos(radians);
  const vertical = Math.sin(radians);
  const horizontalSign = polarDirectionSign(horizontal);
  const verticalSign = polarDirectionSign(vertical);
  const projectedHorizontal = horizontalSign === 0 ? 0 : horizontal;
  const projectedVertical = verticalSign === 0 ? 0 : vertical;
  const { width, height } = measure({ type: 'node', ...label.node, text: label.text }, fontSize);
  const support = polarLabelRadialSupport(projectedHorizontal, projectedVertical, width, height);
  const labelRadius = outerRadius + radialOffset + support;

  return {
    position: [center[0] + projectedHorizontal * labelRadius, center[1] + projectedVertical * labelRadius],
    align: horizontalSign < 0 ? 'end' : horizontalSign > 0 ? 'start' : 'middle',
  };
};

/**
 * 由整图尺寸与角向标签包围盒计算极坐标布局
 * @description 圆心位于显式留白后的可用区域中心；外半径取圆与各角向标签都不越界时的最大值。
 *   标签宽度沿实际角度参与对应边界约束，不把最长标签宽度重复扣在四边；调用方只消费本 frame、不回写 layout。
 *   margin 之大 → 外半径 ≤ 0 → 抛清晰错误，不静默出退化坏图
 */
export const computePolarCoordinate = (context: PolarLayoutContext): PolarLayout => {
  const { width, height } = context.size;
  const fontSize = context.text.fontSize;
  const measure = context.text.measure;
  const explicit: Partial<BoundsInsets> = context.margin ?? {};
  const layoutReserve = context.reserve ?? {};
  const margins: BoundsInsets = {
    top: explicit.top ?? layoutReserve.top ?? 0,
    right: explicit.right ?? layoutReserve.right ?? 0,
    bottom: explicit.bottom ?? layoutReserve.bottom ?? 0,
    left: explicit.left ?? layoutReserve.left ?? 0,
  };

  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = margins[side];
    if (!Number.isFinite(value) || value < 0) {
      throw new RetikzPlotError(`lowerPlots: margin.${side} must be a non-negative finite number, got ${value}`);
    }
  }

  const availableWidth = width - margins.left - margins.right;
  const availableHeight = height - margins.top - margins.bottom;
  const center: [number, number] = [margins.left + availableWidth / 2, margins.top + availableHeight / 2];
  const minX = margins.left;
  const maxX = width - margins.right;
  const minY = margins.top;
  const maxY = height - margins.bottom;
  const radialOffset = DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP;
  let outerRadius = Math.min(availableWidth, availableHeight) / 2;

  for (const label of context.angularLabels) {
    if (!Number.isFinite(label.angle)) continue;

    const radians = (label.angle * Math.PI) / 180;
    const horizontal = Math.cos(radians);
    const vertical = Math.sin(radians);
    const horizontalSign = polarDirectionSign(horizontal);
    const verticalSign = polarDirectionSign(vertical);
    const projectedHorizontal = horizontalSign === 0 ? 0 : horizontal;
    const projectedVertical = verticalSign === 0 ? 0 : vertical;
    const { width: labelWidth, height: labelHeight } = measure(
      { type: 'node', ...label.node, text: label.text },
      fontSize,
    );
    const support = polarLabelRadialSupport(projectedHorizontal, projectedVertical, labelWidth, labelHeight);

    if (horizontalSign === 0) {
      if (center[0] - labelWidth / 2 < minX || center[0] + labelWidth / 2 > maxX) outerRadius = 0;
    } else {
      const horizontalLimit =
        horizontalSign > 0
          ? (maxX - center[0] - labelWidth / 2) / horizontal - radialOffset - support
          : (center[0] - minX - labelWidth / 2) / -horizontal - radialOffset - support;
      outerRadius = Math.min(outerRadius, horizontalLimit);
    }

    if (verticalSign === 0) {
      if (center[1] - labelHeight / 2 < minY || center[1] + labelHeight / 2 > maxY) outerRadius = 0;
    } else {
      const verticalLimit =
        verticalSign > 0
          ? (maxY - center[1] - labelHeight / 2) / vertical - radialOffset - support
          : (center[1] - minY - labelHeight / 2) / -vertical - radialOffset - support;
      outerRadius = Math.min(outerRadius, verticalLimit);
    }
  }

  if (outerRadius <= 0) {
    throw new RetikzPlotError(
      `lowerPlots: polar label reserve / margins exceed the ${width}×${height} canvas, leaving no radius`,
    );
  }

  return { center, outerRadius };
};
