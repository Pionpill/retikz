import { NodeSchema } from '@retikz/core';
import { FlexLayoutSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import type { IRChartPresentation } from '../../src/presentation';

import { resolveChartPresentation } from '../../src/presentation';
import { ChartPresentationSchema } from '../../src/presentation';
import { resolveChartSpec } from '../../src/resolution';
import { ChartThemeToken, getChartThemePreset } from '../../src/style';

const base = {
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

const plotSpec = resolveChartSpec(base).plotSpec;
const tokens = getChartThemePreset('neutral', 'light');
const plotItem = { content: { kind: 'plot' } } as const;

const presetTokenCases = [
  [
    'title',
    ChartThemeToken.ChartTitleForeground,
    ChartThemeToken.ChartTitleFontSize,
    ChartThemeToken.ChartTitleFontWeight,
    ChartThemeToken.ChartTitleLineHeight,
    ChartThemeToken.ChartTitleAlign,
  ],
  [
    'subtitle',
    ChartThemeToken.ChartSubtitleForeground,
    ChartThemeToken.ChartSubtitleFontSize,
    ChartThemeToken.ChartSubtitleFontWeight,
    ChartThemeToken.ChartSubtitleLineHeight,
    ChartThemeToken.ChartSubtitleAlign,
  ],
  [
    'caption',
    ChartThemeToken.ChartCaptionForeground,
    ChartThemeToken.ChartCaptionFontSize,
    ChartThemeToken.ChartCaptionFontWeight,
    ChartThemeToken.ChartCaptionLineHeight,
    ChartThemeToken.ChartCaptionAlign,
  ],
  [
    'note',
    ChartThemeToken.ChartNoteForeground,
    ChartThemeToken.ChartNoteFontSize,
    ChartThemeToken.ChartNoteFontWeight,
    ChartThemeToken.ChartNoteLineHeight,
    ChartThemeToken.ChartNoteAlign,
  ],
  [
    'source',
    ChartThemeToken.ChartSourceForeground,
    ChartThemeToken.ChartSourceFontSize,
    ChartThemeToken.ChartSourceFontWeight,
    ChartThemeToken.ChartSourceLineHeight,
    ChartThemeToken.ChartSourceAlign,
  ],
  [
    'credit',
    ChartThemeToken.ChartCreditForeground,
    ChartThemeToken.ChartCreditFontSize,
    ChartThemeToken.ChartCreditFontWeight,
    ChartThemeToken.ChartCreditLineHeight,
    ChartThemeToken.ChartCreditAlign,
  ],
] as const;

describe('Chart presentation content', () => {
  it('无 presentation 时保留同一个 PlotSpec 与独立 surface padding', () => {
    const result = resolveChartPresentation(undefined, plotSpec, tokens);

    expect(result.content).toBe(plotSpec);
    expect(result.surfacePadding).toEqual(tokens[ChartThemeToken.ChartPadding]);
    expect(result.inspection).toEqual({
      contentKind: 'plot',
      items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$resolved/plot' }],
    });
  });

  it('显式 Plot-only presentation 仍生成 Chart 默认 column FlexLayout', () => {
    const result = resolveChartPresentation(ChartPresentationSchema.parse({ children: [plotItem] }), plotSpec, tokens);
    const content = FlexLayoutSchema.parse(result.content);

    expect(content).toMatchObject({
      namespace: 'standard',
      type: 'flexLayout',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 0,
      overflow: 'visible',
      direction: 'column',
      wrap: 'nowrap',
      gap: { column: 0, row: tokens[ChartThemeToken.ChartGap] },
      justifyContent: 'start',
      alignItems: 'stretch',
      alignContent: 'start',
    });
    expect(content.children).toEqual([
      {
        kind: 'flex',
        key: 'chart.plot',
        child: plotSpec,
        margin: 0,
        basis: 'content',
        grow: 0,
        shrink: 1,
      },
    ]);
    expect(result.inspection).toEqual({
      contentKind: 'flex-layout',
      items: [{ key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/presentation/children/0' }],
    });
  });

  it('按 authored order 映射 preset、custom child 与 Plot，并保留完整 Flex 覆盖', () => {
    const customChild = { type: 'scope', id: 'badge', children: [] } as const;
    const result = resolveChartPresentation(
      ChartPresentationSchema.parse({
        layout: {
          size: { x: { kind: 'fixed', value: 360 }, y: { kind: 'content' } },
          padding: { x: 12 },
          overflow: 'clip',
          direction: 'row',
          wrap: 'wrap',
          gap: { column: 4, row: 6 },
          justifyContent: 'space-between',
          alignItems: 'first-baseline',
          alignContent: 'center',
        },
        children: [
          { content: { kind: 'preset', preset: 'credit', text: 'Retikz' } },
          {
            key: 'badge',
            margin: { right: 3 },
            basis: 24,
            grow: 1,
            shrink: 0,
            min: 12,
            max: 36,
            alignSelf: 'last-baseline',
            content: { kind: 'child', child: customChild },
          },
          { grow: 2, content: { kind: 'plot' } },
          { key: 'closing-credit', content: { kind: 'preset', preset: 'credit', text: 'Team' } },
        ],
      }),
      plotSpec,
      tokens,
    );
    const content = FlexLayoutSchema.parse(result.content);

    expect(content).toMatchObject({
      size: { x: { kind: 'fixed', value: 360 }, y: { kind: 'content' } },
      padding: { x: 12 },
      overflow: 'clip',
      direction: 'row',
      wrap: 'wrap',
      gap: { column: 4, row: 6 },
      justifyContent: 'space-between',
      alignItems: 'first-baseline',
      alignContent: 'center',
    });
    expect(content.children.map(item => item.key)).toEqual([
      'chart.presentation.credit',
      'badge',
      'chart.plot',
      'closing-credit',
    ]);
    expect(content.children[1]).toEqual({
      kind: 'flex',
      key: 'badge',
      child: customChild,
      margin: { right: 3 },
      basis: 24,
      grow: 1,
      shrink: 0,
      min: 12,
      max: 36,
      alignSelf: 'last-baseline',
    });
    expect(content.children[2]).toMatchObject({ key: 'chart.plot', grow: 2, child: plotSpec });
    expect(result.surfacePadding).toEqual(tokens[ChartThemeToken.ChartPadding]);
    expect(result.inspection).toEqual({
      contentKind: 'flex-layout',
      items: [
        {
          key: 'chart.presentation.credit',
          contentKind: 'preset',
          preset: 'credit',
          sourcePath: '$spec/presentation/children/0',
        },
        { key: 'badge', contentKind: 'child', sourcePath: '$spec/presentation/children/1' },
        { key: 'chart.plot', contentKind: 'plot', sourcePath: '$spec/presentation/children/2' },
        {
          key: 'closing-credit',
          contentKind: 'preset',
          preset: 'credit',
          sourcePath: '$spec/presentation/children/3',
        },
      ],
    });
  });

  it('preset wrapper 只覆盖 authored leaf，不改写 TextBlock line/run', () => {
    const text = [
      { text: 'Styled line', fill: '#ff0000', font: { weight: 900 } },
      { runs: [{ text: 'Run', fill: '#0000ff', font: { style: 'italic' } }, { tex: 'x^2' }] },
    ];
    const result = resolveChartPresentation(
      ChartPresentationSchema.parse({
        children: [
          {
            content: {
              kind: 'preset',
              preset: 'title',
              text: {
                text,
                font: { size: 99, style: 'oblique' },
                textColor: '#00ff00',
                align: 'end',
                lineHeight: 100,
                maxTextWidth: 200,
              },
            },
          },
          plotItem,
        ],
      }),
      plotSpec,
      tokens,
    );
    const content = FlexLayoutSchema.parse(result.content);
    const title = NodeSchema.parse(content.children[0]?.child);

    expect(title).toEqual({
      type: 'node',
      position: [0, 0],
      fill: 'none',
      stroke: 'none',
      strokeWidth: 0,
      padding: 0,
      margin: 0,
      text,
      textColor: '#00ff00',
      font: {
        family: tokens[ChartThemeToken.ChartFontFamily],
        size: 99,
        weight: tokens[ChartThemeToken.ChartTitleFontWeight],
        style: 'oblique',
      },
      align: 'end',
      lineHeight: 100,
      maxTextWidth: 200,
    });
  });

  it.each(presetTokenCases)(
    '%s preset 消费自己的 foreground / font / lineHeight / align token',
    (preset, foreground, fontSize, fontWeight, lineHeight, align) => {
      const result = resolveChartPresentation(
        ChartPresentationSchema.parse({
          children: [{ content: { kind: 'preset', preset, text: preset } }, plotItem],
        }),
        plotSpec,
        tokens,
      );
      const content = FlexLayoutSchema.parse(result.content);
      const node = NodeSchema.parse(content.children[0]?.child);

      expect(node).toMatchObject({
        text: preset,
        textColor: tokens[foreground],
        font: {
          family: tokens[ChartThemeToken.ChartFontFamily],
          size: tokens[fontSize],
          weight: tokens[fontWeight],
        },
        lineHeight: tokens[lineHeight],
        align: tokens[align],
      });
    },
  );

  it('presentation Flex padding 与 future surface padding 保持独立', () => {
    const result = resolveChartPresentation(
      ChartPresentationSchema.parse({ layout: { padding: { x: 18 } }, children: [plotItem] }),
      plotSpec,
      tokens,
    );

    expect(result.content).toMatchObject({ padding: { x: 18 } });
    expect(result.surfacePadding).toEqual(tokens[ChartThemeToken.ChartPadding]);
  });

  it('content、surface handoff 与 inspection 不共享 authored mutable references', () => {
    const presentation = ChartPresentationSchema.parse({
      layout: { padding: { x: 8 } },
      children: [
        {
          content: {
            kind: 'preset',
            preset: 'title',
            text: { text: 'Revenue', font: { family: 'Custom' } },
          },
        },
        plotItem,
      ],
    });
    const result = resolveChartPresentation(presentation, plotSpec, tokens);

    const first = presentation.children[0];
    if (
      first.content.kind === 'preset' &&
      typeof first.content.text === 'object' &&
      !Array.isArray(first.content.text)
    ) {
      if (first.content.text.font !== undefined) first.content.text.font.family = 'mutated';
    }
    const padding = presentation.layout?.padding;
    if (typeof padding === 'object') padding.x = 99;

    const content = FlexLayoutSchema.parse(result.content);
    expect(NodeSchema.parse(content.children[0]?.child).font?.family).toBe('Custom');
    expect(content.padding).toEqual({ x: 8 });
    expect(result.surfacePadding).toEqual(tokens[ChartThemeToken.ChartPadding]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('最终 Flex handoff 保留 Standard cross-field failure', () => {
    const invalid = {
      layout: { direction: 'column', alignItems: 'first-baseline' },
      children: [plotItem],
    } as unknown as IRChartPresentation;
    expect(() => resolveChartPresentation(invalid, plotSpec, tokens)).toThrow(
      /Baseline alignment is unavailable when the FlexLayout cross axis is x/,
    );
  });

  it('Chart resolver 保持 PlotSpec 并把 authored Flex content 放入既有 Chart scope', () => {
    const result = resolveChartSpec({
      ...base,
      id: 'sales',
      presentation: {
        children: [
          { key: 'badge', content: { kind: 'child', child: { type: 'scope', id: 'badge', children: [] } } },
          { content: { kind: 'plot' } },
          { content: { kind: 'preset', preset: 'caption', text: 'Quarterly revenue' } },
        ],
      },
    });

    expect(result.plotSpec.id).toBe('sales/plot');
    expect(result.node).toMatchObject({
      type: 'scope',
      id: 'sales',
      children: [
        {
          namespace: 'standard',
          type: 'flexLayout',
          children: [
            { key: 'badge', child: { type: 'scope', id: 'badge' } },
            { key: 'chart.plot', child: { namespace: 'plot', type: 'plot', id: 'sales/plot' } },
            { key: 'chart.presentation.caption', child: { type: 'node', text: 'Quarterly revenue' } },
          ],
        },
      ],
    });
  });
});
