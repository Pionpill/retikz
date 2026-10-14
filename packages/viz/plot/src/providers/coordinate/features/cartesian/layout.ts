import type { IRNode } from '@retikz/core';
import type { BoundsInsets, BoundsRect } from '@retikz/math';

import { RetikzPlotError } from '../../../../error';
import type { PlotLabelMeasure } from '../../../../shared';
import { DEFAULT_AXIS_LABEL_GAP, DEFAULT_AXIS_TICK_LENGTH, guideTextSourceProps } from '../../../../shared';
import type { PlotAreaLayout, PlotAreaLayoutContext } from './types';

/** 一组 label 中最宽的测量像素宽（空集 0） */
const maxLabelWidth = (
  labels: ReadonlyArray<string>,
  fontSize: number,
  measure: PlotLabelMeasure,
  node?: IRNode,
): number =>
  labels.length === 0 ? 0 : Math.max(...labels.map(text => measure({ type: 'node', ...node, text }, fontSize).width));

/**
 * 由整图尺寸 + axis 占位测量 plot area（d3 margin convention）
 * @description 基础留白按每个屏幕维度的首根轴估算，其余轴的外延由调用方反馈到 reserve。
 *   自动留白使用 Core 文字测量结果，用户 context.margin 可逐边覆盖。
 *   margin 之和 ≥ 尺寸（plot area 非正）→ 抛清晰错误，不静默出退化坏图
 */
export const computePlotArea = (context: PlotAreaLayoutContext): PlotAreaLayout => {
  const { width, height } = context.size;
  const xAxis = context.axes.find(axis => axis.guide.dimension === 'x');
  const yAxis = context.axes.find(axis => axis.guide.dimension === 'y');
  const xLabels = xAxis?.ticks.labels ?? [];
  const yLabels = yAxis?.ticks.labels ?? [];
  const xLabelNode: IRNode = { type: 'node', ...guideTextSourceProps(xAxis?.guide.tickLabels || {}) };
  const yLabelNode: IRNode = { type: 'node', ...guideTextSourceProps(yAxis?.guide.tickLabels || {}) };
  const fontSize = context.text.fontSize;
  const measure = context.text.measure;
  const xLabelHeight = Math.max(0, ...xLabels.map(text => measure({ ...xLabelNode, text }, fontSize).height));
  const yLabelHeight = Math.max(0, ...yLabels.map(text => measure({ ...yLabelNode, text }, fontSize).height));
  const reserve = context.reserve ?? {};

  // 额外预留叠加在基础轴留白之外，显式 margin 仍逐边覆盖最终结果
  const auto: BoundsInsets = {
    top: (yAxis !== undefined ? yLabelHeight * 0.5 : 0) + (reserve.top ?? 0),
    right:
      (xAxis !== undefined ? maxLabelWidth(xLabels.slice(-1), fontSize, measure, xLabelNode) * 0.5 : 0) +
      (reserve.right ?? 0),
    bottom:
      (xAxis !== undefined ? DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP + xLabelHeight : 0) +
      (reserve.bottom ?? 0),
    left:
      (yAxis !== undefined
        ? DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP + maxLabelWidth(yLabels, fontSize, measure, yLabelNode)
        : 0) + (reserve.left ?? 0),
  };
  const margins: BoundsInsets = { ...auto, ...context.margin };

  // 用户 margin 可能传入 NaN / 负值——会一路污染出坏坐标，逐边校验有限非负（与 width/height 入口校验同思路）
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = margins[side];
    if (!Number.isFinite(value) || value < 0) {
      throw new RetikzPlotError(`lowerPlots: margin.${side} must be a non-negative finite number, got ${value}`);
    }
  }

  const plotArea: BoundsRect = {
    x: margins.left,
    y: margins.top,
    width: width - margins.left - margins.right,
    height: height - margins.top - margins.bottom,
  };
  if (plotArea.width <= 0 || plotArea.height <= 0) {
    throw new RetikzPlotError(
      `lowerPlots: margins (left ${margins.left} + right ${margins.right}, top ${margins.top} + bottom ${margins.bottom}) exceed the ${width}×${height} canvas, leaving no plot area`,
    );
  }

  return { margins, plotArea };
};
