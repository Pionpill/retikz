import { describe, expect, it } from 'vitest';

import { AxesSchema, createAxes } from '../../../src/presentation';
import { resolveAxes } from '../../../src/presentation/axes/resolve';
import { fullScopeProps } from '../presentation/scope-props';

describe('AxesSchema', () => {
  it('解决默认相关标签和点阵检查，无需修改类型化工厂源', () => {
    const source = createAxes({ x: { extent: 20, label: false }, y: { extent: 20 } });

    expect(source.x).toEqual({ extent: 20, label: false });
    expect(resolveAxes(AxesSchema.parse(JSON.parse(JSON.stringify(source))))).toEqual({
      ...resolveAxes(source),
      position: [0, 0],
    });
    expect(resolveAxes(source).x.label).toBe(false);

    const excessive = createAxes({
      ...source,
      x: { extent: 1, ticks: { source: { kind: 'spacing', spacing: 0.000001 } } },
    });

    expect(() => resolveAxes(excessive)).toThrow(/exceeds/);

    const invalidLabel = createAxes({
      ...source,
      x: {
        extent: 20,
        ticks: {
          source: { kind: 'values', values: [15] },
          labels: { entries: [{ value: 15, text: 'filtered' }] },
        },
      },
    });

    expect(() => resolveAxes(invalidLabel)).toThrow(/emitted tick/);
  });

  it('重用完整的 Core Scope 编写的曲面', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      ...fullScopeProps,
      x: { extent: 20 },
      y: { extent: 20 },
    });

    expect(parsed).toMatchObject(fullScopeProps);
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('保持源稀疏并解析原点和每轴默认值', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 60 },
      y: { extent: { negative: 20, positive: 40 } },
    });

    expect(parsed.origin).toEqual({ position: [0, 0], label: false });
    expect(parsed.x).toEqual({ extent: 60 });
    expect(resolveAxes(parsed)).toMatchObject({
      origin: { position: [0, 0], label: false },
      x: {
        extent: { negative: 60, positive: 60 },
        line: { arrows: 'positive' },
        label: { text: 'x', end: 'positive', offset: 8 },
      },
      y: { extent: { negative: 20, positive: 40 }, line: { arrows: 'positive' }, label: { text: 'y' } },
    });
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('接受独立轴、网格、刻度源和静态标签配置', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      origin: {
        position: [100, 80],
        label: { text: 'O', offset: 5, style: { textColor: '#475569' } },
      },
      x: {
        extent: { negative: 40, positive: 60 },
        line: { arrows: 'negative', style: { stroke: '#334155' } },
        grid: { spacing: 20, offset: 5, style: { stroke: '#e2e8f0' } },
        ticks: {
          source: { kind: 'spacing', spacing: 20, extent: 'positive' },
          side: 'positive',
          labels: {
            entries: [{ value: 20, text: '1' }],
            style: { textColor: '#0f172a', font: { size: 12 } },
          },
        },
        label: { text: 't', end: 'negative', offset: 10 },
      },
      y: {
        extent: { negative: 20, positive: 40 },
        line: false,
        grid: false,
        ticks: {
          source: { kind: 'values', values: [-20, 20, 40] },
          endpointGap: 0,
          labels: { entries: [{ value: 40, text: '2' }] },
        },
        label: false,
      },
    });

    expect(parsed.x).toMatchObject({
      extent: { negative: 40, positive: 60 },
      line: { arrows: 'negative' },
      grid: { spacing: 20, offset: 5 },
      ticks: { source: { kind: 'spacing', extent: 'positive' }, side: 'positive' },
      label: { end: 'negative', offset: 10 },
    });
    expect(parsed.y).toMatchObject({ extent: { negative: 20, positive: 40 }, line: false, grid: false, label: false });
    expect(parsed.origin.label).toMatchObject({ text: 'O', offset: 5 });
  });

  it('默认刻度线段位于轴两侧，具有六个单位的端点间隙', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, ticks: { source: { kind: 'values', values: [-10, 10] } } },
      y: { extent: 20 },
    });

    expect(parsed.x.ticks).toEqual({
      source: { kind: 'values', values: [-10, 10] },
      side: 'both',
      length: 6,
      endpointGap: 6,
    });
    expect(resolveAxes(parsed).x).toMatchObject({ ticks: { side: 'both', endpointGap: 6, length: 6 } });
  });

  it('接受零端点间隙并拒绝负间隙', () => {
    const zeroGap = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, ticks: { source: { kind: 'values', values: [-20, 20] }, endpointGap: 0 } },
      y: { extent: 20 },
    });
    const negativeGap = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, ticks: { source: { kind: 'values', values: [-10, 10] }, endpointGap: -1 } },
      y: { extent: 20 },
    });

    expect(zeroGap.success).toBe(true);
    expect(negativeGap.success).toBe(false);

    if (!negativeGap.success) expect(negativeGap.error.issues[0]?.path).toEqual(['x', 'ticks', 'endpointGap']);
  });

  it('解析轴局部网格偏移和 Core 兼容的箭头详细信息', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 60,
        grid: { spacing: 20, offset: 5 },
        line: {
          arrows: 'both',
          arrowDetail: {
            shape: 'openStealth',
            scale: 1.5,
            color: '#0f172a',
            start: { width: 8 },
            end: { length: 10, opacity: 0.7 },
          },
        },
      },
      y: { extent: 40, grid: { spacing: 10, offset: -10 } },
    });

    expect(parsed.x.grid).toMatchObject({ spacing: 20, offset: 5 });
    expect(parsed.y.grid).toMatchObject({ spacing: 10, offset: -10 });
    expect(parsed.x).toMatchObject({
      line: {
        arrowDetail: {
          shape: 'openStealth',
          scale: 1.5,
          start: { width: 8 },
          end: { length: 10, opacity: 0.7 },
        },
      },
    });
    expect(AxesSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('默认轴网格偏移并拒绝无效的箭头细节', () => {
    const parsed = AxesSchema.parse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, grid: { spacing: 10 } },
      y: { extent: 20 },
    });
    const invalidArrow = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, line: { arrowDetail: { scale: 0 } } },
      y: { extent: 20 },
    });

    expect(parsed.x.grid).toEqual({ spacing: 10, offset: 0 });
    expect(resolveAxes(parsed).x.grid).toMatchObject({ spacing: 10, offset: 0 });
    expect(invalidArrow.success).toBe(false);

    if (!invalidArrow.success)
      expect(invalidArrow.error.issues[0]?.path).toEqual(['x', 'line', 'arrowDetail', 'scale']);
  });

  it('拒绝零长度轴并隐藏每个轴产物', () => {
    const zeroExtent = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: { negative: 0, positive: 0 } },
      y: { extent: 20 },
    });
    const noAxes = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20, line: false, ticks: false, grid: false, label: false },
      y: { extent: 20, line: false, ticks: false, grid: false, label: false },
    });

    expect(zeroExtent.success).toBe(false);
    expect(noAxes.success).toBe(false);

    if (!zeroExtent.success) expect(zeroExtent.error.issues[0]?.path).toEqual(['x', 'extent']);
    if (!noAxes.success) expect(noAxes.error.issues[0]?.path).toEqual(['x']);
  });

  it.each([
    { values: [-20, 0, 20], issuePath: ['x', 'ticks', 'source', 'values', 1] },
    { values: [-20, -20, 20], issuePath: ['x', 'ticks', 'source', 'values', 1] },
    { values: [20, -20], issuePath: ['x', 'ticks', 'source', 'values', 1] },
    { values: [-60, 20], issuePath: ['x', 'ticks', 'source', 'values', 0] },
  ])('拒绝无效的显式刻度值 $values', ({ values, issuePath }) => {
    const parsed = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 40, ticks: { source: { kind: 'values', values } } },
      y: { extent: 20 },
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(issuePath);
  });

  it('拒绝不引用发出的刻度值的刻度标签', () => {
    const spacingLabel = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 50,
        ticks: {
          source: { kind: 'spacing', spacing: 20, extent: 'positive' },
          endpointGap: 0,
          labels: { entries: [{ value: -20, text: 'hidden side' }] },
        },
      },
      y: { extent: 20 },
    });
    const explicitLabel = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 50,
        ticks: {
          source: { kind: 'values', values: [-20, 20] },
          endpointGap: 0,
          labels: { entries: [{ value: 40, text: 'missing' }] },
        },
      },
      y: { extent: 20 },
    });

    expect(spacingLabel.success).toBe(false);
    expect(explicitLabel.success).toBe(false);

    if (!spacingLabel.success)
      expect(spacingLabel.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
    if (!explicitLabel.success)
      expect(explicitLabel.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
  });

  it('拒绝其刻度由端点间隙过滤的刻度标签', () => {
    const parsed = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: {
        extent: 20,
        ticks: {
          source: { kind: 'values', values: [15] },
          endpointGap: 6,
          labels: { entries: [{ value: 15, text: 'filtered' }] },
        },
      },
      y: { extent: 20 },
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['x', 'ticks', 'labels', 'entries', 0, 'value']);
  });

  it('在下沉之前拒绝不安全的晶格尺寸和未知的遗留字段', () => {
    const excessiveTicks = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 1, ticks: { source: { kind: 'spacing', spacing: 0.000001, extent: 'both' } } },
      y: { extent: 1 },
    });
    const unknownField = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: { extent: 20 },
      y: { extent: 20 },
      extent: { x: 20, y: 20 },
    });

    expect(excessiveTicks.success).toBe(false);
    expect(unknownField.success).toBe(false);

    if (!excessiveTicks.success)
      expect(excessiveTicks.error.issues[0]?.path).toEqual(['x', 'ticks', 'source', 'spacing']);
    if (!unknownField.success) expect(unknownField.error.issues[0]?.path).toEqual([]);
  });

  it('拒绝假轴形式', () => {
    const falseAxis = AxesSchema.safeParse({
      namespace: 'standard',
      type: 'axes',
      x: false,
      y: { extent: 20 },
    });

    expect(falseAxis.success).toBe(false);
  });
});
