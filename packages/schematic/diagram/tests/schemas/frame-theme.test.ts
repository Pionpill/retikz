import { describe, expect, it } from 'vitest';

import { DiagramFrameSchema, DiagramThemeSchema } from '../../src/_diagram';

describe('Diagram Frame schema', () => {
  it('parses the complete fixed arrangement and preserves Surface input fields', () => {
    const frame = DiagramFrameSchema.parse({
      legendPosition: 'bottom',
      legendAlign: 'center',
      titleDescriptionGap: 4,
      headingMainGap: 12,
      drawingLegendGap: 8,
      padding: { x: 10, top: 6 },
      background: { fill: '#ffffff', fillOpacity: 0.9 },
      border: { stroke: '#111827', strokeWidth: 2 },
      cornerRadius: 6,
      overflow: 'clip',
    });

    expect(frame).toEqual({
      legendPosition: 'bottom',
      legendAlign: 'center',
      titleDescriptionGap: 4,
      headingMainGap: 12,
      drawingLegendGap: 8,
      padding: { x: 10, top: 6 },
      background: { fill: '#ffffff', fillOpacity: 0.9 },
      border: { stroke: '#111827', strokeWidth: 2 },
      cornerRadius: 6,
      overflow: 'clip',
    });
    expect(JSON.parse(JSON.stringify(frame))).toEqual(frame);
  });

  it.each(['top', 'right', 'bottom', 'left'])('accepts the %s Legend side', legendPosition => {
    expect(DiagramFrameSchema.parse({ legendPosition })).toEqual({ legendPosition });
  });

  it.each([
    {},
    { unknown: true },
    { legendPosition: 'overlay' },
    { legendAlign: 'stretch' },
    { titleDescriptionGap: -1 },
    { headingMainGap: -1 },
    { drawingLegendGap: -1 },
    { padding: -1 },
    { overflow: 'scroll' },
  ])('rejects an empty or invalid Frame record: %j', input => {
    expect(() => DiagramFrameSchema.parse(input)).toThrow();
  });
});

describe('Diagram Theme schema', () => {
  it('parses non-empty frame and presentation appearance slices', () => {
    const theme = DiagramThemeSchema.parse({
      frame: {
        padding: 14,
        titleDescriptionGap: 5,
        headingMainGap: 15,
        drawingLegendGap: 10,
        background: { fill: '#f8fafc' },
        border: { stroke: '#cbd5e1', strokeWidth: 1 },
        cornerRadius: 4,
      },
      presentation: {
        title: {
          textColor: '#0f172a',
          opacity: 0.95,
          font: { family: 'Inter', size: 20, weight: 700, style: 'normal' },
          align: 'start',
          lineHeight: 24,
          maxTextWidth: 320,
        },
        description: {
          textColor: 'gray',
          opacity: 0.8,
          font: { size: 14 },
          align: 'middle',
          lineHeight: 20,
          maxTextWidth: 360,
        },
      },
    });

    expect(theme.frame?.padding).toBe(14);
    expect(theme.presentation?.title?.font).toEqual({ family: 'Inter', size: 20, weight: 700, style: 'normal' });
    expect(JSON.parse(JSON.stringify(theme))).toEqual(theme);
  });

  it.each([
    {},
    { unknown: true },
    { frame: {} },
    { presentation: {} },
    { presentation: { title: {} } },
    { presentation: { description: {} } },
    { frame: { overflow: 'clip' } },
    { frame: { legendPosition: 'left' } },
    { frame: { legendAlign: 'center' } },
    { presentation: { title: { padding: 4 } } },
    { presentation: { title: { position: [0, 0] } } },
    { presentation: { description: { stroke: '#000000' } } },
    { title: { opacity: 1 } },
    { description: { opacity: 1 } },
  ])('rejects empty slices and fields outside Diagram appearance ownership: %j', input => {
    expect(() => DiagramThemeSchema.parse(input)).toThrow();
  });
});
