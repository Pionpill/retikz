import { describe, expect, it } from 'vitest';

import { PlotSchema } from '../../src/schemas';
import { AxisGuideSchema, GuideSchema, LegendGuideSchema } from '../../src/schemas/guide';

describe('GuideSchema 契约', () => {
  // Happy path
  it('接受 x 轴配置', () => {
    const guide = { type: 'axis', dimension: 'x' };

    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('y 轴完全有效', () => {
    const guide = { type: 'axis', dimension: 'y', ticks: { count: 5 }, grid: true, tickLabels: false, id: 'yAxis' };

    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('有网格的轴有效', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true };

    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴和图例接受图层 zindex', () => {
    const axis = { type: 'axis', dimension: 'x', layer: { zIndex: 240 } };
    const legend = { type: 'legend', channel: 'color', layer: { zIndex: 520 } };

    expect(AxisGuideSchema.parse(axis)).toEqual(axis);
    expect(LegendGuideSchema.parse(legend)).toEqual(legend);
  });

  it('引导层拒绝分数 zindex 和未知字段', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', layer: { zIndex: 1.5 } })).toThrow();
    expect(() =>
      LegendGuideSchema.parse({ type: 'legend', channel: 'color', layer: { zIndex: 1, order: 2 } }),
    ).toThrow();
  });

  it('图例样式接受大小符号布局标记', () => {
    const guide = {
      type: 'legend',
      channel: 'size',
      style: {
        symbolSize: 12,
        symbolScale: 0.75,
        symbolFit: 'preserve',
      },
    };

    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('坐标轴网格接受独立刻度来源、密度、次刻度及端帽配置', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      grid: {
        ticks: { interval: { kind: 'number', step: 10 } },
        density: { kind: 'sample', maxCount: 4 },
        includeDomain: true,
        bandPosition: 0,
        lineCap: 'round',
        minor: {
          ticks: { values: [5, 15, 25] },
          density: { kind: 'sample', minGap: 12 },
          bandPosition: 1,
          stroke: '#e2e8f0',
          lineCap: 'butt',
        },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴网格域端点策略接受布尔值和往返', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      grid: { includeDomain: false },
    };

    expect(AxisGuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  // 边界
  it('轴省略可选有效', () => {
    const guide = { type: 'axis', dimension: 'y' };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径
  it('引导未知类型被拒绝', () => {
    // grid 不是独立 type；legend 已纳入 union，但缺 channel 的 legend（仅给 dimension）仍非法
    expect(() => GuideSchema.parse({ type: 'grid', dimension: 'y' })).toThrow();
    expect(() => GuideSchema.parse({ type: 'legend', dimension: 'y' })).toThrow();
  });

  it('导轨缺失尺寸被拒绝', () => {
    expect(() => GuideSchema.parse({ type: 'axis' })).toThrow();
  });

  it('轴自定义尺寸名称有效', () => {
    const guide = { type: 'axis', dimension: 'angle' };

    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴刻度计数非正被拒绝', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { count: 0 } })).toThrow();
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { count: -1 } })).toThrow();
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { count: 2.5 } })).toThrow();
  });

  it('轴网格非布尔值被拒绝', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', grid: 'yes' })).toThrow();
  });

  it('轴网格拒绝无效的次要和带位置', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { bandPosition: -0.1 } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { bandPosition: 1.1 } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { minor: true } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { minor: {} } })).toThrow();
  });

  it('轴网格域端点策略拒绝非布尔值和次要用法', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { includeDomain: 'yes' } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        grid: { minor: { ticks: { values: [0.5] }, includeDomain: true } },
      }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { includeDomain: true, endpoint: true } }),
    ).toThrow();
  });

  it('图例符号布局拒绝无效值', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'size', style: { symbolSize: 0 } })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'size', style: { symbolScale: 0 } })).toThrow();
    expect(() =>
      LegendGuideSchema.parse({ type: 'legend', channel: 'size', style: { symbolFit: 'stretch' } }),
    ).toThrow();
  });

  // 交互
  it('导游往返', () => {
    const guide = {
      type: 'axis',
      dimension: 'y',
      ticks: { count: 4 },
      grid: true,
      tickLabels: { format: '.1f' },
      id: 'yA',
    };

    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  it('坐标轴标题接受文本块及样式', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      title: { text: ['Revenue', { text: 'USD', fill: '#666' }], font: { size: 12 }, textColor: '#111' },
      tickLabels: { format: '$.2f', rotate: -30, align: 'end' },
      line: { stroke: '#333', dashPattern: [4, 2], dashOffset: 1.5 },
      ticks: { values: [0, 10], length: 6 },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴线虚线偏移拒绝非有限值', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { dashOffset: Number.NaN } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { dashOffset: Number.POSITIVE_INFINITY } }),
    ).toThrow();
  });

  it('轴线接受高级几何形状', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      placement: { kind: 'origin', origin: 0, tickSide: 'bottom', offset: 2 },
      line: {
        lineCap: 'round',
        extent: { from: -5, to: 5 },
        arrow: {
          negative: true,
          positive: { shape: 'stealth', length: 8, width: 6 },
        },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴线空箭头对象被拒绝', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { arrow: {} } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { arrow: { negative: false, positive: false } } }),
    ).toThrow();
  });

  it('坐标轴刻度接受间隔、密度和形状标记', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      ticks: {
        interval: { kind: 'number', step: 10, anchor: 0 },
        density: { kind: 'sample', maxCount: 6, minGap: 24 },
        mark: { kind: 'triangle', size: 6, orientation: 'outward', fill: 'currentColor' },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴标题放置接受核心标签关键字和比例', () => {
    const keywordGuide = {
      type: 'axis',
      dimension: 'x',
      title: { text: 'x', placement: 'at-end' },
    };
    const ratioGuide = {
      type: 'axis',
      dimension: 'x',
      title: { text: 'x', placement: 0.4 },
    };

    expect(AxisGuideSchema.parse(keywordGuide)).toEqual(keywordGuide);
    expect(AxisGuideSchema.parse(ratioGuide)).toEqual(ratioGuide);
  });

  it('轴标题接受填充锚点移位和布局', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      title: {
        text: 'x',
        padding: 8,
        placement: 'very-near-end',
        anchor: { align: 'end', baseline: 'top' },
        shift: { along: -6, normal: 2 },
        layout: { reserveSpace: false, avoidTickLabels: true, avoidLineMarks: true, overflow: 'flush' },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴标题放置拒绝超出范围的比率', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        title: { text: 'x', placement: 1.2 },
      }),
    ).toThrow();
  });

  it('轴标题拒绝间隙和空布局对象', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', gap: 4 } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', shift: {} } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', anchor: {} } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', layout: { overflow: 'clip' } } }),
    ).toThrow();
  });

  it('轴标题方向接受语义旋转模式', () => {
    for (const orientation of ['auto', 'horizontal', 'axis']) {
      const guide = {
        type: 'axis',
        dimension: 'y',
        title: { text: 'y', orientation },
      };

      expect(AxisGuideSchema.parse(guide)).toEqual(guide);
    }
  });

  it('坐标轴标题朝向拒绝未知模式', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'y',
        title: { text: 'y', orientation: 'upright' },
      }),
    ).toThrow();
  });

  it('轴交叉策略接受角标签和隐藏刻度', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      crossing: { value: 0, tick: 'hide', label: 'corner', corner: 'bottom-left' },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴交叉策略拒绝非有限值和未使用的角点', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        crossing: { value: Number.POSITIVE_INFINITY },
      }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        crossing: { label: 'hide', corner: 'bottom-left' },
      }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        crossing: { tick: 'hide', corner: 'bottom-left' },
      }),
    ).toThrow();
  });

  it('刻度端点策略拒绝负距离', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        ticks: { endpoint: { distance: -1 } },
      }),
    ).toThrow();
  });

  it('轴刻度接受自定义形状标记', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      ticks: {
        values: [0, 1],
        mark: { kind: 'custom', shape: { type: 'polygon', params: { sides: 5 } }, width: 8, height: 6 },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('刻度配置拒绝无效密度、间隔及标记冲突', () => {
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { density: { kind: 'sample' } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { interval: { kind: 'number', step: 0 } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { mark: { kind: 'line' }, length: 4 } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { mark: { kind: 'custom' } } }),
    ).toThrow();
  });

  it('轴刻度标签接受自适应布局', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      tickLabels: {
        layout: {
          rotate: { angles: [0, -45, -90], recoverWhenFailed: false },
          hide: { strategy: 'parity', preserveEnds: true, separation: 4 },
          bounds: { overflow: 'hide', tolerance: 2 },
          sampleSize: 8,
        },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('轴刻度标签拒绝无效的布局值', () => {
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { rotate: { angles: [] } } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { hide: { separation: -1 } } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { bounds: { tolerance: -1 } } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { sampleSize: 0 } } }),
    ).toThrow();
  });

  it('主题中的坐标轴线拒绝结构性几何字段', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { values: [{ x: 1, y: 2 }] },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
      defaultPlot: {
        axis: {
          line: {
            arrow: { positive: true },
          },
        },
      },
    };

    expect(() => PlotSchema.parse(spec)).toThrow();
  });

  it('主题刻度接受标记但拒绝刻度来源及密度', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
        defaultPlot: { axis: { ticks: { mark: { kind: 'circle', size: 4 } } } },
      }),
    ).not.toThrow();
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
        defaultPlot: { axis: { ticks: { count: 5 } } },
      }),
    ).toThrow();
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
        defaultPlot: { axis: { ticks: { density: { kind: 'sample', maxCount: 4 } } } },
      }),
    ).toThrow();
  });

  it('主题轴刻度标签接受布局但拒绝格式', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
        defaultPlot: { axis: { tickLabels: { layout: { hide: { strategy: 'greedy' } } } } },
      }),
    ).not.toThrow();
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
        defaultPlot: { axis: { tickLabels: { format: '.2f' } } },
      }),
    ).toThrow();
  });

  it('主题网格接受端帽及定义域端点但拒绝仅用于辅助元素的字段', () => {
    expect(() =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
        defaultPlot: {
          axis: { grid: { stroke: '#ddd', lineCap: 'round', includeDomain: true } },
        },
      }),
    ).not.toThrow();

    for (const grid of [
      { ticks: { count: 4 } },
      { density: { kind: 'sample', maxCount: 4 } },
      { includeDomain: 'yes' },
      { minor: { ticks: { values: [1] } } },
      { bandPosition: 0.5 },
      { applyTo: 'all' },
      { select: { view: 'main' } },
    ]) {
      expect(() =>
        PlotSchema.parse({
          namespace: 'plot',
          type: 'plot',
          data: { reference: 'd' },
          scales: [
            { type: 'linear', name: 'x' },
            { type: 'linear', name: 'y' },
          ],
          coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
          marks: [{ type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } }],
          defaultPlot: { axis: { grid } },
        }),
      ).toThrow();
    }
  });
});

describe('GuideSchema 绘图尺寸', () => {
  it('在 schema 层有效的轴角度尺寸', () => {
    expect(GuideSchema.parse({ type: 'axis', dimension: 'angle' })).toEqual({ type: 'axis', dimension: 'angle' });
  });

  it('在 schema 层有效的轴半径尺寸', () => {
    expect(GuideSchema.parse({ type: 'axis', dimension: 'radius' })).toEqual({ type: 'axis', dimension: 'radius' });
  });

  it('轴 theta 维度在 schema 层有效', () => {
    expect(GuideSchema.parse({ type: 'axis', dimension: 'theta' })).toEqual({ type: 'axis', dimension: 'theta' });
  });

  it('x、y、z 轴配置保持往返等价', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true, tickLabels: false, id: 'xAxis' };

    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});

describe('LegendGuideSchema 契约', () => {
  // Happy path
  it('接受图例最小配置', () => {
    // 最小合法 legend：仅 type + channel
    const guide = { type: 'legend', channel: 'color' };

    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('接受图例完整字段配置', () => {
    const guide = {
      type: 'legend',
      channel: 'size',
      scale: '__size_population',
      title: 'Population',
      position: 'bottom',
      orient: 'horizontal',
      ticks: { count: 4 },
      tickLabels: { format: '.1f' },
      style: { swatchSize: 12, label: { textColor: '#334155' } },
    };

    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('图例各通道有效', () => {
    for (const channel of ['color', 'size', 'opacity', 'shape'] as const) {
      expect(LegendGuideSchema.parse({ type: 'legend', channel })).toEqual({ type: 'legend', channel });
    }
  });

  it('接受图例的各个位置', () => {
    for (const position of ['right', 'left', 'top', 'bottom'] as const) {
      const guide = { type: 'legend', channel: 'color', position };

      expect(LegendGuideSchema.parse(guide)).toEqual(guide);
    }
  });

  // 边界：可选字段省略
  it('图例可省略可选字段', () => {
    const guide = { type: 'legend', channel: 'opacity' };

    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径
  it('图例缺失通道被拒绝', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend' })).toThrow();
  });

  it('图例自定义通道名称有效', () => {
    const guide = { type: 'legend', channel: 'intensity' };

    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('图例空通道被拒绝', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: '' })).toThrow();
  });

  it('图例错误位置被拒绝', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', position: 'center' })).toThrow();
  });

  it('传说坏东方被拒绝', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', orient: 'diagonal' })).toThrow();
  });

  it.each(['', '   '])('图例空白刻度 %j 被拒绝', scale => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', scale })).toThrow();
  });

  it('图例空标题报告图例相关错误消息', () => {
    const result = LegendGuideSchema.safeParse({ type: 'legend', channel: 'color', title: '' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message.includes('legend title'))).toBe(true);
    }
  });

  it('图例刻度计数非正被拒绝', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', ticks: { count: 0 } })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', ticks: { count: -2 } })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', ticks: { count: 3.5 } })).toThrow();
  });

  it('图例刻度标签非布尔值被拒绝', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', tickLabels: 'yes' })).toThrow();
  });
});

describe('GuideSchema 歧视性工会契约', () => {
  // union 判别：legend 合法
  it('联合接受图例', () => {
    const guide = { type: 'legend', channel: 'color', position: 'right' };

    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // type 缺失 → union 无法判别 → 报错可定位到 type
  it('联合缺失类型在类型路径处被拒绝', () => {
    const result = GuideSchema.safeParse({ channel: 'color' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('type'))).toBe(true);
    }
  });

  // type 拼错 → union 无合法成员 → 报错可定位
  it('联合错误类型被拒绝', () => {
    const result = GuideSchema.safeParse({ type: 'lgend', channel: 'color' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('type'))).toBe(true);
    }
  });

  // zod parse 错误路径：legend 缺 channel → issue.path 定位到 channel
  it('联合图例缺少通道路径', () => {
    const result = GuideSchema.safeParse({ type: 'legend' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('channel'))).toBe(true);
    }
  });

  // JSON round-trip：legend 全字段保形
  it('传说往返满', () => {
    const guide = {
      type: 'legend',
      channel: 'color',
      scale: '__color',
      title: 'Density',
      position: 'left',
      orient: 'vertical',
      ticks: { count: 5 },
      tickLabels: false,
    };

    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  // JSON round-trip：axis（回归 union 后仍保形）
  it('通过并轴往返', () => {
    const guide = { type: 'axis', dimension: 'y', ticks: { count: 4 }, grid: true };

    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});
