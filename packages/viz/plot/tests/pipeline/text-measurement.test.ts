import type { ScenePrimitive, TextMeasurer } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createPlotLineageLocator, createPlotLocator, lowerPlotWithLineage } from '../../src';
import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSchema } from '../../src/schemas';

/** 收集最终绘制的叶子图元，忽略分组层级 */
const leaves = (primitives: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? leaves(primitive.children) : [primitive]));

/** 用可控字体度量编译真实 Plot，验证布局和最终文字消费同一宿主能力 */
const compile = (
  measureText: TextMeasurer,
  extra: Record<string, unknown> = {},
  firstGroup = 'Alpha',
  fontSize = 16,
) => {
  const plot = PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    width: 480,
    height: 300,
    data: { reference: 'd' },
    scales: [
      { name: 'x', type: 'linear', domain: [0, 1], domainPadding: 0 },
      { name: 'y', type: 'linear', domain: [0, 1], domainPadding: 0 },
      { name: 'color', type: 'ordinal' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' }, color: { field: 'group', scale: 'color' } },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y' },
    ],
    ...extra,
  });
  return leaves(
    compileToScene(
      { version: 1, type: 'scene', children: [plot] },
      {
        composites: lowerPlots({
          d: [
            { x: 0, y: 0, group: firstGroup },
            { x: 1, y: 1, group: '中文' },
          ],
        }),
        measureText,
        fontSize,
        padding: 0,
      },
    ).scene.primitives,
  );
};

describe('Plot 使用 Core 文字测量参与布局', () => {
  it('独立下沉和两种定位器使用显式 Core 环境，与实际绘制位置一致', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sample',
      data: { reference: 'd' },
      scales: [
        { name: 'x', type: 'linear', domain: [0, 1], domainPadding: 0 },
        { name: 'y', type: 'linear', domain: [0, 1], domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', kind: 'data', encodings: { position: { x: 'x', y: 'y' } } }],
      guides: [
        { type: 'axis', dimension: 'x', tickLabels: { font: { size: '1.5em' } } },
        { type: 'axis', dimension: 'y', tickLabels: { font: { size: '1.5em' } } },
      ],
    });
    const data = {
      d: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    };
    const measureText: TextMeasurer = (text, font) => ({ width: text.length * font.size, height: font.size });
    const environment = { compile: { measureText, fontSize: 20, padding: 0 } };
    const normal = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { ...environment.compile, composites: lowerPlots(data) },
    ).scene;
    const lowered = lowerPlotWithLineage(spec, data, { environment });
    const standalone = compileToScene(
      { version: 1, type: 'scene', children: lowered.children },
      environment.compile,
    ).scene;
    expect(leaves(standalone.primitives)).toEqual(leaves(normal.primitives));
    const points = leaves(normal.primitives).filter(p => p.type === 'ellipse');
    const locator = createPlotLocator(spec, data, { environment });
    const lineageLocator = createPlotLineageLocator(spec, data, { environment });
    for (const [index, point] of points.entries()) {
      expect(locator.datum(index)?.position).toEqual([point.cx, point.cy]);
      expect(lineageLocator.datum(index)?.anchor.position).toEqual([point.cx, point.cy]);
    }
    expect(createPlotLocator(spec, data, { environment: {} }).datum(0)?.position).not.toEqual(
      locator.datum(0)?.position,
    );
  });

  it('一维直角坐标的留白也使用宿主测量', () => {
    const extra = {
      coordinate: { type: 'cartesian1D', x: 'x' },
      marks: [{ type: 'point', kind: 'data', encodings: { position: { x: 'x' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    };
    const narrow = compile(text => ({ width: text.length * 4, height: 10 }), extra).filter(p => p.type === 'ellipse');
    const wide = compile(text => ({ width: text.length * 20, height: 10 }), extra).filter(p => p.type === 'ellipse');
    expect(wide[1].cx).toBeLessThan(narrow[1].cx);
  });

  it.each([16, 20])('轴与图例的 em 字号继承外层 %s，测量与数值字号绘制一致', inheritedSize => {
    const measure: TextMeasurer = (text, font) => ({ width: (text.length * font.size) / 2, height: font.size });
    const guides = (size: number | string) => ({
      guides: [
        { type: 'axis', dimension: 'x', tickLabels: { font: { size } }, title: { text: 'Time', font: { size } } },
        { type: 'axis', dimension: 'y', tickLabels: { font: { size } } },
        { type: 'legend', channel: 'color', scale: 'color', style: { label: { font: { size } } }, title: 'Legend' },
      ],
    });
    const relative = compile(measure, guides('1.5em'), 'Alpha', inheritedSize);
    const absolute = compile(measure, guides(inheritedSize * 1.5), 'Alpha', inheritedSize);
    expect(relative).toEqual(absolute);
    const labels = relative.filter(p => p.type === 'text').filter(p => !p.lines.some(line => line.text === 'Legend'));
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(p => p.fontSize === inheritedSize * 1.5)).toBe(true);
  });

  it('富文本标题按 run 字体测量并保持与刻度标签的间距', () => {
    const measure: TextMeasurer = (text, font) => ({ width: text.length * font.size, height: font.size });
    const titleOf = (size: number) =>
      compile(measure, {
        guides: [
          { type: 'axis', dimension: 'y', title: { text: [{ runs: [{ text: 'Rich', font: { size } }] }], rotate: 0 } },
        ],
      })
        .filter(p => p.type === 'text')
        .find(p => p.lines.some(line => line.text === 'Rich'))!;
    const small = titleOf(12);
    const large = titleOf(24);
    expect(large.measuredWidth).toBeGreaterThan(small.measuredWidth);
    expect(large.x).toBeLessThan(small.x);
    expect(large.x + large.measuredWidth).toBeCloseTo(small.x + small.measuredWidth);
  });

  it('旋转标签按宿主文字宽度增加底部空间', () => {
    const extra = { guides: [{ type: 'axis', dimension: 'x', tickLabels: { rotate: 90 } }] };
    const narrow = compile(text => ({ width: text.length * 4, height: 10 }), extra).filter(p => p.type === 'ellipse');
    const wide = compile(text => ({ width: text.length * 20, height: 10 }), extra).filter(p => p.type === 'ellipse');
    expect(wide[0].cy).toBeLessThan(narrow[0].cy);
  });

  it('多行图例的文字边界与相邻条目不重叠', () => {
    const primitives = compile(
      text => ({ width: text.length * 8, height: 10 }),
      {
        guides: [
          {
            type: 'legend',
            channel: 'color',
            scale: 'color',
            position: 'right',
            orient: 'vertical',
            style: { label: { maxTextWidth: 20, lineHeight: 24 } },
          },
        ],
      },
      'Alpha\nBeta',
    ).filter(p => p.type === 'text');
    const first = primitives.find(p => p.lines.map(line => line.text).join('') === 'AlphaBeta')!;
    const second = primitives.find(p => p.lines.map(line => line.text).join('') === '中文')!;
    expect(first.lines.length).toBeGreaterThan(1);
    expect(second.y - first.y).toBeGreaterThanOrEqual((first.measuredHeight + second.measuredHeight) / 2);
  });

  it('较宽的纵轴文字增大左留白，较高的横轴文字增大底部留白', () => {
    const small = compile(text => ({ width: text.length * 4, height: 10 })).filter(p => p.type === 'ellipse');
    const wide = compile(text => ({ width: text.length * 12, height: 10 })).filter(p => p.type === 'ellipse');
    const tall = compile(text => ({ width: text.length * 4, height: 10 }), {
      guides: [
        { type: 'axis', dimension: 'x', tickLabels: { lineHeight: 36 } },
        { type: 'axis', dimension: 'y' },
      ],
    }).filter(p => p.type === 'ellipse');
    expect(wide[0].cx).toBeGreaterThan(small[0].cx);
    expect(tall[0].cy).toBeLessThan(small[0].cy);
  });

  it('横向图例按实际中英文字宽移动后续条目', () => {
    const extra = {
      guides: [{ type: 'legend', channel: 'color', scale: 'color', position: 'bottom', orient: 'horizontal' }],
    };
    const small = compile(text => ({ width: text.length * 4, height: 10 }), extra).filter(p => p.type === 'text');
    const wide = compile(text => ({ width: text.length * 12, height: 10 }), extra).filter(p => p.type === 'text');
    const smallLabel = small.find(p => p.lines.some(line => line.text === '中文'))!;
    const wideLabel = wide.find(p => p.lines.some(line => line.text === '中文'))!;
    expect(wideLabel.x).toBeGreaterThan(smallLabel.x);
    expect(wideLabel.measuredWidth).toBeGreaterThan(smallLabel.measuredWidth);
  });

  it('角向标签变宽时缩小极坐标绘图半径', () => {
    const extra = { coordinate: { type: 'polar2D', x: 'x', y: 'y' }, guides: [{ type: 'axis', dimension: 'x' }] };
    const small = compile(text => ({ width: text.length * 4, height: 10 }), extra).filter(p => p.type === 'ellipse');
    const wide = compile(text => ({ width: text.length * 14, height: 10 }), extra).filter(p => p.type === 'ellipse');
    expect(Math.hypot(wide[1].cx - 240, wide[1].cy - 150)).toBeLessThan(
      Math.hypot(small[1].cx - 240, small[1].cy - 150),
    );
  });

  it('标签字体与字重参与测量并改变布局', () => {
    const measure: TextMeasurer = (text, font) => ({
      width: text.length * (font.family === 'Wide' && font.weight === 'bold' ? 16 : 4),
      height: font.size,
    });
    const small = compile(measure).filter(p => p.type === 'ellipse');
    const wide = compile(measure, {
      guides: [{ type: 'axis', dimension: 'y', tickLabels: { font: { family: 'Wide', weight: 'bold' } } }],
    }).filter(p => p.type === 'ellipse');
    expect(wide[0].cx).toBeGreaterThan(small[0].cx);
  });
});
