import type { IRChild } from '@retikz/core';
import { LayoutAlignment } from '@retikz/layout';
import { describe, expect, it } from 'vitest';

import { createLegend } from '../../src/presentation/legend/composite';
import {
  LegendContentKind,
  LegendDirection,
  LegendSampleAlignment,
  LegendWrap,
} from '../../src/presentation/legend/constants';
import { resolveLegend } from '../../src/presentation/legend/resolve';
import { LegendSchema } from '../../src/presentation/legend/schema';
import type { LegendInput } from '../../src/presentation/legend/types';
import { fullScopeProps } from '../composites/presentation/scope-props';

const sample: IRChild = { type: 'node', position: [0, 0], text: 'Sample' };

const label: IRChild = { type: 'node', position: [0, 0], text: 'Label' };

const expectIssuePath = (value: unknown, path: string): void => {
  const parsed = LegendSchema.safeParse(value);

  expect(parsed.success).toBe(false);

  if (!parsed.success) {
    expect(parsed.error.issues.some(issue => issue.path.join('.') === path)).toBe(true);
  }
};

describe('Legend schema 和工厂', () => {
  it('导出解析配置中的静态默认值', () => {
    expect(
      LegendSchema.parse({ namespace: 'standard', type: 'legend', content: { kind: 'items', items: [] } }),
    ).toMatchObject({
      titleGap: 8,
      content: { direction: 'vertical', sampleGap: 8, gap: 8 },
    });
  });

  it('重用完整的 Core Scope 编写的曲面', () => {
    const parsed = LegendSchema.parse({
      namespace: 'standard',
      type: 'legend',
      ...fullScopeProps,
      content: { kind: LegendContentKind.Items, items: [] },
    });

    expect(parsed).toMatchObject(fullScopeProps);
    expect(LegendSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('保持编写项目稀疏并解析执行默认值', () => {
    const input = {
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'primary', sample, label }],
      },
    } satisfies LegendInput;
    const source = createLegend(input);

    expect(source).toEqual({ namespace: 'standard', type: 'legend', ...input });

    const parsed = resolveLegend(source);

    expect(parsed).toEqual({
      namespace: 'standard',
      type: 'legend',
      titleGap: 8,
      contentAlign: 'start',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      overflow: 'visible',
      content: {
        kind: 'items',
        direction: 'vertical',
        wrap: 'nowrap',
        gap: { row: 8, column: 8 },
        sampleGap: 8,
        sampleAlign: 'center',
        items: [{ key: 'primary', sample, label }],
      },
    });
  });

  it('标准化均匀间隙简写，同时保留独立轴值和显式零', () => {
    const uniform = createLegend({
      content: { kind: LegendContentKind.Items, gap: 5, items: [] },
    });
    const independent = createLegend({
      content: { kind: LegendContentKind.Items, gap: { row: 6, column: 5 }, items: [] },
    });
    const zero = createLegend({
      content: { kind: LegendContentKind.Items, gap: 0, items: [] },
    });

    expect(uniform.content).toMatchObject({ gap: 5 });
    expect(resolveLegend(uniform).content).toMatchObject({ gap: { row: 5, column: 5 } });
    expect(independent.content).toMatchObject({ gap: { row: 6, column: 5 } });
    expect(zero.content).toMatchObject({ gap: 0 });
    expect(resolveLegend(zero).content).toMatchObject({ gap: { row: 0, column: 0 } });
  });

  it('创建规范渐变 IR 并保持实际 JSON 往返等价', () => {
    const parsed = createLegend({
      title: label,
      content: {
        kind: LegendContentKind.Ramp,
        sample,
        ticks: [
          { key: 'low', offset: 0, label },
          { key: 'high', offset: 1 },
        ],
      },
    });
    const roundTripped = LegendSchema.parse(JSON.parse(JSON.stringify(parsed)));

    expect(resolveLegend(parsed)).toEqual({
      namespace: 'standard',
      type: 'legend',
      title: label,
      titleGap: 8,
      contentAlign: 'start',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      overflow: 'visible',
      content: {
        kind: 'ramp',
        direction: 'vertical',
        sample,
        sampleGap: 8,
        ticks: [
          { key: 'low', offset: 0, label },
          { key: 'high', offset: 1 },
        ],
      },
    });
    expect(resolveLegend(roundTripped)).toEqual({ ...resolveLegend(parsed), position: [0, 0] });
  });

  it('通过 JSON 保持显式内容对齐，并拒绝根字段中不支持的值', () => {
    const centered = createLegend({
      contentAlign: LayoutAlignment.Center,
      content: { kind: LegendContentKind.Items, items: [] },
    });
    const ended = createLegend({
      contentAlign: LayoutAlignment.End,
      content: { kind: LegendContentKind.Ramp, sample, ticks: [] },
    });

    expect(LegendSchema.parse(JSON.parse(JSON.stringify(centered))).contentAlign).toBe(LayoutAlignment.Center);
    expect(LegendSchema.parse(JSON.parse(JSON.stringify(ended))).contentAlign).toBe(LayoutAlignment.End);

    expectIssuePath(
      {
        namespace: 'standard',
        type: 'legend',
        contentAlign: 'stretch',
        content: { kind: 'items', items: [] },
      },
      'contentAlign',
    );
  });

  it('保留明确的方向、换行、对齐、间距、大小、填充和溢出', () => {
    expect(
      createLegend({
        title: label,
        titleGap: 3,
        size: { x: { kind: 'fixed', value: 120 }, y: { kind: 'fill', min: 40, max: 200 } },
        padding: { top: 1, right: 2, bottom: 3, left: 4 },
        overflow: 'clip',
        content: {
          kind: LegendContentKind.Items,
          direction: LegendDirection.Horizontal,
          wrap: LegendWrap.Wrap,
          gap: { row: 6, column: 5 },
          sampleGap: 7,
          sampleAlign: LegendSampleAlignment.End,
          items: [],
        },
      }),
    ).toMatchObject({
      titleGap: 3,
      size: { x: { kind: 'fixed', value: 120 }, y: { kind: 'fill', min: 40, max: 200 } },
      padding: { top: 1, right: 2, bottom: 3, left: 4 },
      overflow: 'clip',
      content: {
        direction: 'horizontal',
        wrap: 'wrap',
        gap: { row: 6, column: 5 },
        sampleGap: 7,
        sampleAlign: 'end',
      },
    });
  });

  it('拒绝其编写路径中的未知根、内容、项目和刻度字段', () => {
    const root = createLegend({ content: { kind: LegendContentKind.Items, items: [] } });

    expectIssuePath({ ...root, extra: true }, '');
    expectIssuePath({ ...root, content: { ...root.content, extra: true } }, 'content');
    expectIssuePath({ ...root, content: { ...root.content, columnGap: 1 } }, 'content');
    expectIssuePath({ ...root, content: { ...root.content, rowGap: 1 } }, 'content');
    expectIssuePath(
      {
        ...root,
        content: { kind: 'items', items: [{ key: 'item', sample, extra: true }] },
      },
      'content.items.0',
    );
    expectIssuePath(
      {
        ...root,
        content: { kind: 'ramp', sample, ticks: [{ key: 'tick', offset: 0, extra: true }] },
      },
      'content.ticks.0',
    );
  });

  it('接受根 Scope 身份并拒绝非子标题、样本和标签值', () => {
    const base = createLegend({ content: { kind: LegendContentKind.Items, items: [] } });

    const scoped = createLegend({
      id: 'legend',
      localNamespace: true,
      zIndex: 2,
      transforms: [{ kind: 'translate', x: 4, y: 5 }],
      meta: { source: 'test' },
      content: { kind: LegendContentKind.Items, items: [] },
      defaults: { style: { stroke: '#334155' } },
    });

    expect(scoped).toMatchObject({
      id: 'legend',
      localNamespace: true,
      zIndex: 2,
      transforms: [{ kind: 'translate', x: 4, y: 5 }],
      meta: { source: 'test' },
      defaults: { style: { stroke: '#334155' } },
    });

    expectIssuePath({ ...base, title: 'Legend' }, 'title');
    expectIssuePath(
      { ...base, content: { kind: 'items', items: [{ key: 'item', sample: 'line' }] } },
      'content.items.0.sample',
    );
    expectIssuePath(
      { ...base, content: { kind: 'items', items: [{ key: 'item', sample, label: 'Label' }] } },
      'content.items.0.label',
    );
    expectIssuePath(
      { ...base, content: { kind: 'ramp', sample, ticks: [{ key: 'tick', offset: 0, label: 'Low' }] } },
      'content.ticks.0.label',
    );
  });

  it('在必须更改的键处拒绝空白和重复的编写键', () => {
    const base = createLegend({ content: { kind: LegendContentKind.Items, items: [] } });

    const blank = LegendSchema.safeParse({
      ...base,
      content: { kind: 'items', items: [{ key: '   ', sample }] },
    });

    expect(blank.success).toBe(false);

    if (!blank.success) {
      expect(blank.error.issues.filter(issue => issue.path.join('.') === 'content.items.0.key')).toEqual([
        expect.objectContaining({ message: 'String must contain at least one non-whitespace character.' }),
      ]);
    }

    expectIssuePath(
      {
        ...base,
        content: {
          kind: 'items',
          items: [
            { key: 'same', sample },
            { key: 'same', sample },
          ],
        },
      },
      'content.items.1.key',
    );
    expectIssuePath(
      {
        ...base,
        content: {
          kind: 'ramp',
          sample,
          ticks: [
            { key: 'same', offset: 0 },
            { key: 'same', offset: 1 },
          ],
        },
      },
      'content.ticks.1.key',
    );
  });

  it('拒绝负数或非有限间距以及无效的溢出值', () => {
    const items = { kind: LegendContentKind.Items, items: [] } satisfies Extract<
      LegendInput['content'],
      { kind: typeof LegendContentKind.Items }
    >;

    expect(() =>
      LegendSchema.parse({ namespace: 'standard', type: 'legend', ...{ titleGap: -1, content: items } }),
    ).toThrow();
    expect(() =>
      LegendSchema.parse({ namespace: 'standard', type: 'legend', ...{ padding: -1, content: items } }),
    ).toThrow();
    expect(() =>
      LegendSchema.parse({ namespace: 'standard', type: 'legend', ...{ content: { ...items, gap: -1 } } }),
    ).toThrow();
    expect(() =>
      LegendSchema.parse({
        namespace: 'standard',
        type: 'legend',
        ...{ content: { ...items, gap: { row: Number.POSITIVE_INFINITY, column: 8 } } },
      }),
    ).toThrow();

    expectIssuePath(
      {
        namespace: 'standard',
        type: 'legend',
        content: { ...items, gap: { row: 8, column: -1 } },
      },
      'content.gap.column',
    );

    expect(() =>
      LegendSchema.parse({
        namespace: 'standard',
        type: 'legend',
        ...{ content: { ...items, sampleGap: Number.NaN } },
      }),
    ).toThrow();

    expectIssuePath(
      {
        namespace: 'standard',
        type: 'legend',
        overflow: 'scroll',
        content: items,
      },
      'overflow',
    );
  });

  it('拒绝格式错误的内容、固定内容和填充大小变体', () => {
    const base = {
      namespace: 'standard',
      type: 'legend',
      content: { kind: 'items', items: [] },
    } as const;

    expectIssuePath({ ...base, size: { x: { kind: 'content', value: 10 }, y: { kind: 'content' } } }, 'size.x');
    expectIssuePath({ ...base, size: { x: { kind: 'fixed' }, y: { kind: 'content' } } }, 'size.x.value');
    expectIssuePath({ ...base, size: { x: { kind: 'fixed', value: -1 }, y: { kind: 'content' } } }, 'size.x.value');
    expectIssuePath({ ...base, size: { x: { kind: 'fill', value: 10 }, y: { kind: 'content' } } }, 'size.x');
    expectIssuePath({ ...base, size: { x: { kind: 'fill', min: 20, max: 10 }, y: { kind: 'content' } } }, 'size.x.max');
  });

  it('拒绝其他内容表单中的字段，而不是默默地删除它们', () => {
    const base = {
      namespace: 'standard',
      type: 'legend',
    } as const;

    expectIssuePath({ ...base, content: { kind: 'items', items: [], sample, ticks: [] } }, 'content');
    expectIssuePath({ ...base, content: { kind: 'ramp', sample, ticks: [], items: [], wrap: 'wrap' } }, 'content');
  });

  it('拒绝精确路径上的非有限、超出范围和递减的斜坡偏移', () => {
    const base = {
      namespace: 'standard',
      type: 'legend',
      content: { kind: 'ramp', sample },
    } as const;

    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'nan', offset: Number.NaN }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'infinite', offset: Number.POSITIVE_INFINITY }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'low', offset: -0.01 }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      { ...base, content: { ...base.content, ticks: [{ key: 'high', offset: 1.01 }] } },
      'content.ticks.0.offset',
    );
    expectIssuePath(
      {
        ...base,
        content: {
          ...base.content,
          ticks: [
            { key: 'high', offset: 0.8 },
            { key: 'low', offset: 0.2 },
          ],
        },
      },
      'content.ticks.1.offset',
    );
  });
});
