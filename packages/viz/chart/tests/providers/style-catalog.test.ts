import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { getChartStylePreset } from '../../src/providers';
import { ChartResolvedStyleTokensSchema, ChartStyle, ChartStyleToken, ChartThemeMode } from '../../src/schemas';

const styles = Object.values(ChartStyle);
const modes = Object.values(ChartThemeMode);
const canonicalKeys = Object.values(ChartStyleToken);

describe('Chart style preset catalog', () => {
  it('精确锁定 ADR 的八份完整 resolved map', () => {
    const digests = Object.fromEntries(
      styles.flatMap(style =>
        modes.map(mode => [
          `${style}/${mode}`,
          createHash('sha256')
            .update(JSON.stringify(getChartStylePreset(style, mode)))
            .digest('hex'),
        ]),
      ),
    );

    expect(digests).toEqual({
      'neutral/light': '21ad623daa2f76b83796c0711110dc46ab9f885c3d06ffe7d6f60ff1967c8451',
      'neutral/dark': '32f8ed34888405bdb1c27560983adc761318e301dba397e7d1914dad2b2a7825',
      'academic/light': 'ef45f435feb7618d23ad9819ea88ce2e292abdf66e551bea1809f9d0a57327e0',
      'academic/dark': '992af5cf55dda48d9c5b85aa158f3dbda2cbc6dde201fb28275053e98d4a5aac',
      'vibrant/light': '69490527113ed843e3f7f9df98d71625318535c981ad455f32e71393c573891b',
      'vibrant/dark': '44ae6e828061687773fd64380f8e8a8fd7763f4226f3aa00be4157291667df4b',
      'clean/light': 'b3059bb9fb28867f595a0db7b6b541ec68ef39c6e7697575190a8896ba7ada55',
      'clean/dark': '713cfd44fcffa18103d4c206669f9456e5f8d2124185e9cafeca72463441d8c9',
    });
  });

  it('为四个 preset × 两个 mode 返回完整合法且 key 同序的 map', () => {
    for (const style of styles) {
      for (const mode of modes) {
        const tokens = getChartStylePreset(style, mode);
        expect(ChartResolvedStyleTokensSchema.parse(tokens)).toEqual(tokens);
        expect(Object.keys(tokens)).toEqual(canonicalKeys);
      }
    }
  });

  it('mode 只改变 paint 与 palette，保持 topology、排版、尺寸和 scheme', () => {
    const modeSensitive = new Set([
      'chart.canvas.fill',
      'plot.surface.fill',
      'plot.foreground',
      'plot.label.foreground',
      ...['title', 'subtitle', 'caption', 'note', 'source', 'credit'].map(slot => `chart.${slot}.foreground`),
      'axis.line.stroke',
      'axis.tickLabel.foreground',
      'axis.title.foreground',
      'axis.grid.stroke',
      'legend.title.foreground',
      'legend.label.foreground',
      'data.palette.categorical',
      'data.palette.series',
      'data.palette.sector',
    ]);

    for (const style of styles) {
      const light = getChartStylePreset(style, ChartThemeMode.Light);
      const dark = getChartStylePreset(style, ChartThemeMode.Dark);
      for (const key of canonicalKeys) {
        if (key === ChartStyleToken.AxisTickMark && style === ChartStyle.Academic) {
          const lightTick = light[key];
          const darkTick = dark[key];
          if (
            lightTick === false ||
            darkTick === false ||
            lightTick.kind !== 'line' ||
            darkTick.kind !== 'line' ||
            lightTick.line === false ||
            darkTick.line === false ||
            lightTick.line === undefined ||
            darkTick.line === undefined
          ) {
            throw new Error('academic tick must stay a styled line mark');
          }
          expect({ ...lightTick, line: { ...lightTick.line, stroke: undefined } }).toEqual({
            ...darkTick,
            line: { ...darkTick.line, stroke: undefined },
          });
          expect(lightTick.line.stroke).toBe(light[ChartStyleToken.AxisLineStroke]);
          expect(darkTick.line.stroke).toBe(dark[ChartStyleToken.AxisLineStroke]);
        } else if (!modeSensitive.has(key)) {
          expect(dark[key]).toEqual(light[key]);
        }
      }
    }
  });

  it('冻结 ADR 中的结构倾向与 palette', () => {
    expect(getChartStylePreset('neutral', 'light')).toMatchObject({
      'chart.padding': 16,
      'axis.line.enabled': false,
      'axis.grid.enabled': true,
      'data.palette.categorical': ['#E76E50', '#2A9D90', '#274754', '#E8C468', '#F4A462'],
    });
    expect(getChartStylePreset('academic', 'light')['axis.tick.mark']).toEqual({
      kind: 'line',
      length: 4,
      line: { stroke: '#9CA3AF', strokeWidth: 1 },
    });
    expect(getChartStylePreset('vibrant', 'dark')['data.palette.sequential']).toBe('turbo');
    expect(getChartStylePreset('clean', 'light')['axis.grid.enabled']).toBe(false);
  });

  it('每次返回独立 clone，调用方 mutation 不污染 catalog', () => {
    const first = getChartStylePreset('neutral', 'light');
    first['data.palette.categorical'][0] = '#000000';
    first['axis.line.enabled'] = true;
    const second = getChartStylePreset('neutral', 'light');
    expect(second['data.palette.categorical'][0]).toBe('#E76E50');
    expect(second['axis.line.enabled']).toBe(false);
  });
});
