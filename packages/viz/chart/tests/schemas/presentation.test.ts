import { describe, expect, it } from 'vitest';

import {
  CHART_PRESENTATION_DEFAULT_ITEM_KEY_BY_PRESET,
  ChartPresentationDefaultItemKey,
  ChartPresentationItemContentKind,
  ChartPresentationPreset,
  ChartPresentationResolvedContentKind,
  ChartPresentationSchema,
  ChartPresentationTextBlockSchema,
} from '../../src/schemas';

const plotItem = { content: { kind: 'plot' } } as const;

describe('Chart presentation schema', () => {
  it('公开 preset、item kind、resolved kind 与默认 key vocabulary', () => {
    expect(ChartPresentationPreset).toEqual({
      Title: 'title',
      Subtitle: 'subtitle',
      Caption: 'caption',
      Note: 'note',
      Source: 'source',
      Credit: 'credit',
    });
    expect(ChartPresentationItemContentKind).toEqual({ Plot: 'plot', Preset: 'preset', Child: 'child' });
    expect(ChartPresentationResolvedContentKind).toEqual({ Plot: 'plot', FlexLayout: 'flex-layout' });
    expect(ChartPresentationDefaultItemKey).toEqual({
      Plot: 'chart.plot',
      Title: 'chart.presentation.title',
      Subtitle: 'chart.presentation.subtitle',
      Caption: 'chart.presentation.caption',
      Note: 'chart.presentation.note',
      Source: 'chart.presentation.source',
      Credit: 'chart.presentation.credit',
    });
    expect(CHART_PRESENTATION_DEFAULT_ITEM_KEY_BY_PRESET).toEqual({
      title: 'chart.presentation.title',
      subtitle: 'chart.presentation.subtitle',
      caption: 'chart.presentation.caption',
      note: 'chart.presentation.note',
      source: 'chart.presentation.source',
      credit: 'chart.presentation.credit',
    });
  });

  it('按 authored order 接受完整 Standard Flex container 与 item 字段', () => {
    const input = {
      layout: {
        size: { x: { kind: 'fixed', value: 360 }, y: { kind: 'content' } },
        padding: { x: 12, top: 8 },
        overflow: 'clip',
        direction: 'row',
        wrap: 'wrap',
        columnGap: 4,
        rowGap: 6,
        justifyContent: 'space-between',
        alignItems: 'first-baseline',
        alignContent: 'center',
      },
      children: [
        {
          key: 'badge',
          margin: { right: 3 },
          basis: 24,
          grow: 0,
          shrink: 0,
          min: 12,
          max: 36,
          alignSelf: 'last-baseline',
          content: { kind: 'child', child: { type: 'scope', id: 'badge', children: [] } },
        },
        plotItem,
        {
          content: { kind: 'preset', preset: 'title', text: 'Revenue' },
        },
      ],
    } as const;

    expect(ChartPresentationSchema.parse(input)).toEqual(input);
  });

  it('允许重复 preset 使用显式不同 key', () => {
    expect(
      ChartPresentationSchema.parse({
        children: [
          { content: { kind: 'preset', preset: 'note', text: 'Primary note' } },
          plotItem,
          { key: 'secondary-note', content: { kind: 'preset', preset: 'note', text: 'Secondary note' } },
        ],
      }).children.map(item => item.key),
    ).toEqual([undefined, undefined, 'secondary-note']);
  });

  it.each(['', [], ['', { text: '' }], [{ runs: [{ text: '' }, { tex: '' }] }]])(
    '拒绝没有任何 non-empty text 或 tex 的 TextBlock：%j',
    value => {
      expect(() => ChartPresentationTextBlockSchema.parse(value)).toThrow();
    },
  );

  it.each([' ', ['ok'], [{ runs: [{ text: 'ok' }] }], [{ runs: [{ tex: 'x' }] }]])(
    '接受至少一个包含字符的 text / tex：%j',
    value => {
      expect(ChartPresentationTextBlockSchema.parse(value)).toEqual(value);
    },
  );

  it('接受闭合 styled preset text 并拒绝非文本 leaf', () => {
    const styled = {
      text: [
        { text: 'FY 2026', fill: '#123456', font: { weight: 600 } },
        { runs: [{ text: 'North', font: { style: 'italic' } }, { tex: 'x^2' }] },
      ],
      font: { family: 'Inter', size: 14 },
      textColor: '#334155',
      align: 'middle',
      lineHeight: 18,
      maxTextWidth: 240,
    } as const;
    expect(
      ChartPresentationSchema.parse({
        children: [{ content: { kind: 'preset', preset: 'subtitle', text: styled } }, plotItem],
      }).children[0]?.content,
    ).toEqual({ kind: 'preset', preset: 'subtitle', text: styled });
    expect(() =>
      ChartPresentationSchema.parse({
        children: [{ content: { kind: 'preset', preset: 'title', text: { text: 'A', color: 'red' } } }, plotItem],
      }),
    ).toThrow();
  });

  it.each([
    [{ children: [] }, ['children']],
    [{ children: [{ content: { kind: 'preset', preset: 'title', text: 'A' } }] }, ['children']],
    [{ children: [plotItem, plotItem] }, ['children', 1, 'content']],
    [{ children: [{ key: 'main', content: { kind: 'plot' } }] }, ['children', 0, 'key']],
    [
      { children: [{ content: { kind: 'child', child: { type: 'scope', children: [] } } }, plotItem] },
      ['children', 0, 'key'],
    ],
    [
      { children: [{ key: '', content: { kind: 'child', child: { type: 'scope', children: [] } } }, plotItem] },
      ['children', 0, 'key'],
    ],
    [
      {
        children: [
          { content: { kind: 'preset', preset: 'title', text: 'A' } },
          { content: { kind: 'preset', preset: 'title', text: 'B' } },
          plotItem,
        ],
      },
      ['children', 1, 'key'],
    ],
    [
      {
        children: [plotItem, { key: 'chart.plot', content: { kind: 'preset', preset: 'caption', text: 'A' } }],
      },
      ['children', 1, 'key'],
    ],
  ] as const)('拒绝 presentation structural invariant：%j', (input, expectedPath) => {
    const result = ChartPresentationSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(expectedPath);
  });

  it('沿用 Standard min/max 与 column baseline 失败语义', () => {
    const invalidMinMax = ChartPresentationSchema.safeParse({
      children: [plotItem, { key: 'note', min: 12, max: 8, content: { kind: 'preset', preset: 'note', text: 'A' } }],
    });
    expect(invalidMinMax.success).toBe(false);
    if (!invalidMinMax.success) expect(invalidMinMax.error.issues[0]?.path).toEqual(['children', 1, 'max']);

    const invalidBaseline = ChartPresentationSchema.safeParse({
      layout: { alignItems: 'first-baseline' },
      children: [plotItem],
    });
    expect(invalidBaseline.success).toBe(false);
    if (!invalidBaseline.success) expect(invalidBaseline.error.issues[0]?.path).toEqual(['layout', 'alignItems']);
  });

  it('拒绝未知字段与显式 undefined', () => {
    expect(() => ChartPresentationSchema.parse({ children: [plotItem], toolbar: true })).toThrow();
    expect(() => ChartPresentationSchema.parse({ layout: { gap: 4 }, children: [plotItem] })).toThrow();
    expect(() => ChartPresentationSchema.parse({ children: [{ ...plotItem, grow: 1, extra: true }] })).toThrow();
    expect(() =>
      ChartPresentationSchema.parse({
        children: [{ content: { kind: 'plot', child: { type: 'scope', children: [] } } }],
      }),
    ).toThrow();
    expect(() => ChartPresentationSchema.parse({ layout: undefined, children: [plotItem] })).toThrow();
    expect(() => ChartPresentationSchema.parse({ children: [{ ...plotItem, grow: undefined }] })).toThrow();
  });

  it('解析时隔离 authored input 并保持 JSON round-trip', () => {
    const authoredFont = { family: 'Inter' };
    const input = {
      layout: { padding: { x: 8 } },
      children: [
        {
          content: {
            kind: 'preset',
            preset: 'title',
            text: { text: 'Revenue', font: authoredFont },
          },
        },
        plotItem,
      ],
    };
    const parsed = ChartPresentationSchema.parse(input);

    authoredFont.family = 'mutated';
    input.layout.padding.x = 99;

    expect(parsed).toMatchObject({
      layout: { padding: { x: 8 } },
      children: [{ content: { kind: 'preset', text: { font: { family: 'Inter' } } } }, plotItem],
    });
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });
});
