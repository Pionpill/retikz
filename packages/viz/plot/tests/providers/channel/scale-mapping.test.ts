import { defineScale, resolveScale } from '@retikz/data';
import type { ScaleDefinition } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { ChannelDefinitionResolveContext } from '../../../src/contract';
import { BUILTIN_NODE_CHANNELS, resolveNumericChannel, resolveScaleRegistry } from '../../../src/providers';
import { resolveAttributeMapping } from '../../../src/resolve/scale';
import type { IRPlotScaleOperation } from '../../../src/schemas';

const contextOf = (
  scales: Array<IRPlotScaleOperation>,
  definitions: Array<ScaleDefinition> = [],
): ChannelDefinitionResolveContext => ({
  node: { namespace: 'plot', type: 'plot', data: { reference: 'rows' }, scales, marks: [] },
  rows: [{ value: 10 }, { value: 30 }, { value: 80 }],
  model: [{ name: 'value', type: 'continuous' }],
  resolveScaleMapping: (operation, context = {}) =>
    resolveAttributeMapping(operation, context, { registry: resolveScaleRegistry(definitions) }),
  resolveChannelScale: () => {
    throw new Error('unused color consumer');
  },
  resolveCategoryDomain: () => [],
  resolveColorScheme: () => () => '#000000',
});

describe('通道消费数学比例尺', () => {
  it('形状使用分档结果，允许 Core 的开放形状名', () => {
    const context = contextOf([
      { type: 'threshold', name: 'shapes', breakpoints: [30, 70], range: ['circle', 'ellipse', 'custom-shape'] },
    ]);
    const result = BUILTIN_NODE_CHANNELS.shape.resolve(context, {
      type: 'point',
      encodings: { shape: { field: 'value', scale: 'shapes' } },
    });
    expect(context.rows.map(row => result?.resolver(row))).toEqual(['circle', 'ellipse', 'custom-shape']);
  });

  it('直通属性不静默忽略显式比例尺', () => {
    const context = contextOf([{ type: 'ordinal', name: 'text', range: ['a', 'b'] }]);
    expect(() =>
      BUILTIN_NODE_CHANNELS.lineCap.resolve(context, {
        type: 'point',
        encodings: { lineCap: { field: 'value', scale: 'text' } },
      }),
    ).toThrow(/does not support scale mapping/);
  });
  it('尺寸分档与描述信息来自同一次映射，等于阈值进入下一档', () => {
    const context = contextOf([{ type: 'threshold', name: 'risk', breakpoints: [30, 70], range: [4, 8, 12] }]);
    const result = BUILTIN_NODE_CHANNELS.size.resolve(context, {
      type: 'point',
      encodings: { size: { field: 'value', scale: 'risk' } },
    });
    expect(context.rows.map(row => result?.resolver(row))).toEqual([4, 8, 12]);
    expect(result?.descriptor?.mapping?.thresholds).toEqual([30, 70]);
    expect(result?.descriptor?.range).toEqual([4, 8, 12]);
  });

  it('已有数值通道直接使用 Data 自定义定义，无需新的通道', () => {
    const custom = defineScale({
      type: 'custom-number',
      paramsSchema: strictObject({}),
      isFieldCompatible: () => true,
      resolve: context => resolveScale({ type: 'linear', domain: [0, 100], range: [0, 1] }, context),
    });
    const context = contextOf([{ type: 'custom-number', name: 'confidence' }], [custom]);
    const result = resolveNumericChannel(context, { field: 'value', scale: 'confidence' }, 'opacity');
    expect(result?.resolver({ value: 30 })).toBeCloseTo(0.3);
    expect(result?.descriptor?.mapping?.map(30)).toBeCloseTo(0.3);
  });

  it('透明度拒绝越界输出，未声明映射的原始数值仍直通', () => {
    const context = contextOf([{ type: 'linear', name: 'bad', range: [0, 2] }]);
    expect(() => resolveNumericChannel(context, { field: 'value', scale: 'bad' }, 'opacity')).toThrow(/out-of-range/);
    expect(resolveNumericChannel(context, 'value', 'rotate')?.resolver({ value: 30 })).toBe(30);
  });
});
