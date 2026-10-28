import { describe, expect, it } from 'vitest';

import { TableCellAppearanceSchema, TableCellBackgroundSchema, TableCellContentStyleSchema } from '../../src';

describe('Table Cell 外观 schema', () => {
  it('解析 JSON 安全背景​​、内容默认值和候选边框', () => {
    const input = {
      background: { fill: '#fff4e5', fillOpacity: 0.75 },
      content: {
        defaults: {
          style: {
            color: '#9a4d00',
            fill: 'currentColor',
            stroke: '#7c2d12',
            strokeWidth: 2,
            opacity: { fill: 0.5, stroke: 0.8, overall: 0.9 },
          },
          reset: ['node', 'path'],
          node: { style: { textColor: '#9a4d00', font: { weight: 600 } }, label: { textColor: '#7c2d12' } },
          path: { style: { lineCap: 'round' }, label: { textColor: '#7c2d12' }, arrow: { fill: '#7c2d12' } },
        },
      },
      borders: { top: { kind: 'none', priority: 4 }, bottom: { kind: 'line', width: 2 } },
    };

    const parsed = TableCellAppearanceSchema.parse(JSON.parse(JSON.stringify(input)));

    expect(parsed).toEqual(input);
    expect(TableCellBackgroundSchema.parse({ fill: 'none' })).toEqual({ fill: 'none' });
  });

  it('拒绝仅不透明背景和非有限不透明度', () => {
    expect(() => TableCellBackgroundSchema.parse({ fillOpacity: 0.5 })).toThrow();
    expect(() => TableCellBackgroundSchema.parse({ fill: '#fff', fillOpacity: Number.NaN })).toThrow();
    expect(() => TableCellBackgroundSchema.parse({ fill: '#fff', fillOpacity: 1.1 })).toThrow();
  });

  it.each([
    { padding: 4 },
    { span: { rows: 2 } },
    { children: [] },
    { transform: { kind: 'translate', x: 1, y: 2 } },
    { content: { children: [] } },
    { content: { id: 'private-scope' } },
    { background: { fill: '#fff', stroke: '#000' } },
  ])('拒绝布局、拓扑、渲染器和未知字段 %#', input => {
    expect(() => TableCellAppearanceSchema.parse(input)).toThrow();
  });

  it('使用与公共 Core Scope 风格频道相同的封闭内容词汇', () => {
    expect(
      TableCellContentStyleSchema.parse({
        defaults: {
          style: { color: 'currentColor', strokeWidth: 1.5 },
          node: {
            style: { font: { family: 'serif', size: 12 } },
          },
          reset: true,
        },
      }),
    ).toEqual({
      defaults: {
        style: { color: 'currentColor', strokeWidth: 1.5 },
        node: {
          style: { font: { family: 'serif', size: 12 } },
        },
        reset: true,
      },
    });
  });

  it('仅保留内容颜色字符串，同时接受上下文背景和边框颜色', () => {
    expect(
      TableCellAppearanceSchema.parse({
        background: { fill: 0.2 },
        borders: { bottom: { kind: 'line', stroke: 0.8 } },
      }),
    ).toEqual({
      background: { fill: 0.2 },
      borders: { bottom: { kind: 'line', stroke: 0.8 } },
    });
    expect(() =>
      TableCellContentStyleSchema.parse({
        defaults: { style: { color: 0.8 } },
      }),
    ).toThrow();
  });
});
