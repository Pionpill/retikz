import { describe, expect, it } from 'vitest';

import {
  BubbleChartEncodingsSchema,
  BubbleChartMarkSchema,
  BubbleChartPropertiesSchema,
  BubbleChartSchema,
} from '../../src/point/bubble';

const bubble = {
  namespace: 'chart',
  type: 'point',
  data: { reference: 'rows' },
  recipe: {
    chartType: 'bubble',
    encodings: { x: 'income', y: 'lifeExpectancy', size: 'population' },
  },
} as const;

describe('气泡 Chart 精确 Source schema', () => {
  it('解析精确的 Point 系列包络和往返 JSON', () => {
    const parsed = BubbleChartSchema.parse(bubble);

    expect(parsed).toEqual({ ...bubble, recipe: { ...bubble.recipe, properties: { autoPadding: 'point-aware' } } });
    expect(BubbleChartPropertiesSchema.parse({}).autoPadding).toBe('point-aware');
    expect(BubbleChartPropertiesSchema.parse({ autoPadding: 'max-radius' }).autoPadding).toBe('max-radius');
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });

  it.each(['x', 'y', 'size'] as const)('需要非空白 %s 字段映射', role => {
    const encodings = { ...bubble.recipe.encodings };
    Reflect.deleteProperty(encodings, role);

    expect(BubbleChartEncodingsSchema.safeParse(encodings).success).toBe(false);
    expect(BubbleChartEncodingsSchema.safeParse({ ...bubble.recipe.encodings, [role]: '   ' }).success).toBe(false);
  });

  it('接受 Bubble 字段映射角色并且仅接受 sqrt 兼容的大小比例', () => {
    expect(
      BubbleChartEncodingsSchema.safeParse({
        x: { field: 'income', scale: { operation: { type: 'log', name: 'incomeScale' } } },
        y: 'lifeExpectancy',
        size: {
          field: 'populationShare',
          scale: { operation: { type: 'sqrt', name: 'populationSize' } },
        },
        color: 'continent',
        opacity: { aggregate: { kind: 'mean', field: 'confidence', as: 'meanConfidence' } },
        shape: 'category',
        column: 'continent',
        facet: { spacing: { panelGap: 12 } },
      }).success,
    ).toBe(true);

    expect(
      BubbleChartEncodingsSchema.safeParse({
        ...bubble.recipe.encodings,
        size: { field: 'population', scale: { operation: { type: 'linear', name: 'populationSize' } } },
      }).success,
    ).toBe(false);

    expect(
      BubbleChartEncodingsSchema.safeParse({
        x: 'income',
        y: 'lifeExpectancy',
        size: {
          field: 'adjustedPopulation',
        },
      }).success,
    ).toBe(true);
  });

  it('保持大小字段绑定并且从气泡属性中不可用', () => {
    expect(
      BubbleChartPropertiesSchema.safeParse({
        opacity: 0,
        shape: 'circle',
        domainPadding: { kind: 'ratio', default: 0.04, left: 0.02 },
      }).success,
    ).toBe(true);
    expect(BubbleChartPropertiesSchema.safeParse({ size: 8 }).success).toBe(false);
    expect(BubbleChartMarkSchema.safeParse({ kind: 'bubble', properties: { domainPadding: 0.04 } }).success).toBe(
      false,
    );
  });

  it('拒绝气泡标记的显式大小覆盖', () => {
    for (const mark of [
      { kind: 'bubble', encodings: { size: 'otherPopulation' } },
      { kind: 'bubble', properties: { size: 8 } },
    ]) {
      expect(
        BubbleChartSchema.safeParse({
          ...bubble,
          recipe: { ...bubble.recipe, marks: [mark] },
        }).success,
      ).toBe(false);
    }
  });

  it('强制执行构面组合依赖性', () => {
    expect(
      BubbleChartEncodingsSchema.safeParse({
        ...bubble.recipe.encodings,
        facet: { empty: 'show' },
      }).success,
    ).toBe(false);
  });
});
