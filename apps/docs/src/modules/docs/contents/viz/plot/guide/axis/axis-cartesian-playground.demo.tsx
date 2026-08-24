import { IntervalMark, PathMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { axisCartesianPlaygroundControls, previewControlContract } from './axis-cartesian-playground.controls';
import { axisCartesianPlaygroundRows } from './axis-cartesian-playground.data';

/** 注册回退使用的笛卡尔坐标轴综合控件 */
export const previewControls = axisCartesianPlaygroundControls;

type AxisCartesianPlaygroundValues = PreviewControlValuesFor<typeof axisCartesianPlaygroundControls>;

/** 构造连续轴共用的刻度配置 */
const buildTicks = (values: AxisCartesianPlaygroundValues) => {
  const mark =
    values.markKind === 'line'
      ? ({ kind: 'line', length: 6 } as const)
      : ({
          kind: values.markKind,
          size: 6,
          orientation: 'inward',
          fill: '#334155',
        } as const);

  return {
    interval: { kind: 'number' as const, step: Number(values.intervalStep) },
    density: { kind: 'sample' as const, maxCount: values.maxCount, minGap: values.minGap },
    mark,
  };
};

/** 构造独立于轴刻度的网格配置 */
const buildGrid = (values: AxisCartesianPlaygroundValues) => {
  const minor = values.showMinor
    ? {
        ticks: { interval: { kind: 'number' as const, step: Number(values.minorStep) } },
        stroke: '#94a3b8',
        drawOpacity: 0.35,
        dashPattern: [2, 3],
      }
    : undefined;

  return {
    ticks: { interval: { kind: 'number' as const, step: Number(values.gridStep), anchor: 0 } },
    includeDomain: values.includeDomain,
    stroke: '#94a3b8',
    drawOpacity: values.gridOpacity,
    lineCap: 'round' as const,
    minor,
  };
};

/** 渲染分类轴标签布局场景 */
const renderCategoricalScene = (values: AxisCartesianPlaygroundValues) => {
  const hide =
    values.hideStrategy === 'none'
      ? false
      : {
          strategy: values.hideStrategy,
          preserveEnds: true,
        };
  const rotate = values.rotation === 'auto' ? { angles: [0, -45, -90] } : false;
  const fixedRotate = values.rotation === 'auto' ? undefined : Number(values.rotation);

  return (
    <Plot data={axisCartesianPlaygroundRows} width={380} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="category" y="y" fill="#2563eb" />
      <PlotAxis
        dimension="x"
        tickLabels={{
          rotate: fixedRotate,
          layout: {
            rotate,
            hide,
            bounds: { overflow: values.overflow },
          },
        }}
      />
      <PlotAxis dimension="y" grid ticks={{ count: 5 }} title="y" />
    </Plot>
  );
};

/** 渲染边缘或原点连续轴场景 */
const renderContinuousScene = (values: AxisCartesianPlaygroundValues) => {
  const ticks = buildTicks(values);
  const grid = buildGrid(values);

  if (values.scene === 'continuous-origin') {
    const arrow = values.showArrow ? { positive: { shape: 'stealth' as const, length: 7 } } : undefined;
    const endpoint = values.showArrow ? { distance: values.endpointDistance } : false;
    const crossing = {
      value: 0,
      tick: 'hide' as const,
      label: values.crossingLabel,
      ...(values.crossingLabel === 'corner' ? { corner: values.corner } : {}),
    };

    return (
      <Plot data={axisCartesianPlaygroundRows} width={380} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
        <PlotScale dimension="x" type="linear" domain={[-35, 35]} />
        <PlotScale dimension="y" type="linear" domain={[-5, 35]} />
        <PathMark x="x" y="y" order="x" stroke="#2563eb" />
        <PlotAxis
          dimension="x"
          placement={{ kind: 'origin', origin: 0, tickSide: 'bottom' }}
          line={{ arrow, extent: { from: -35, to: 35 } }}
          ticks={{ ...ticks, endpoint }}
          crossing={crossing}
          grid={grid}
          title={{ text: 'x', placement: 'at-end' }}
        />
        <PlotAxis
          dimension="y"
          placement={{ kind: 'origin', origin: 0, tickSide: 'left' }}
          line={{ arrow, extent: { from: -5, to: 35 } }}
          ticks={{ values: [0, 10, 20, 30], endpoint }}
          crossing={{ value: 0, tick: 'hide', label: 'hide' }}
          title={{ text: 'y', placement: 'at-end', orientation: 'horizontal' }}
        />
      </Plot>
    );
  }

  return (
    <Plot data={axisCartesianPlaygroundRows} width={380} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      <PlotScale dimension="x" type="linear" domain={[-35, 35]} />
      <PlotScale dimension="y" type="linear" domain={[0, 35]} />
      <PathMark x="x" y="y" order="x" stroke="#2563eb" />
      <PlotAxis dimension="x" ticks={ticks} grid={grid} title="x" />
      <PlotAxis dimension="y" ticks={{ count: 5 }} title="y" />
    </Plot>
  );
};

/** 渲染笛卡尔坐标轴综合示例 */
const renderCartesianPlayground = (values: AxisCartesianPlaygroundValues) =>
  values.scene === 'categorical' ? renderCategoricalScene(values) : renderContinuousScene(values);

const controlledPreview = defineControlledPreview(previewControlContract, renderCartesianPlayground);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在一个笛卡尔试验场中组合刻度、网格、标签、原点、箭头与交点控制 */
export default controlledPreview.Component;
