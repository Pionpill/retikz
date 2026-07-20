import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ArcSectorAngleModel from '@/modules/docs/contents/kernel/components/shapes/arc-sector/arc-sector-angle-model.demo';

const pageSource = (locale: 'zh' | 'en') =>
  readFileSync(resolve(`src/modules/docs/contents/kernel/components/shapes/arc-sector/index.${locale}.mdx`), 'utf8');

const attributeNumber = (markup: string, name: string) => {
  const value = markup.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  if (value === undefined) throw new Error(`Missing ${name} attribute`);
  return Number(value);
};

describe('Arc / Sector angle model figure', () => {
  it('uses the md preview height in both locales', () => {
    for (const locale of ['zh', 'en'] as const) {
      expect(pageSource(locale)).toContain('<ComponentPreview files="arc-sector-angle-model" size="md" hideCode />');
    }
  });

  it('keeps the sweepAngle label clear of the orange arc', () => {
    (globalThis as typeof globalThis & { React: typeof React }).React = React;
    const markup = renderToStaticMarkup(<ArcSectorAngleModel />);
    const labelGroup = Array.from(markup.matchAll(/<g>(.*?)<\/g>/g), match => match[1]).find(group =>
      group.includes('sweepAngle'),
    );
    if (!labelGroup) throw new Error('Missing sweepAngle label group');

    const left = attributeNumber(labelGroup, 'x');
    const top = attributeNumber(labelGroup, 'y');
    const right = left + attributeNumber(labelGroup, 'width');
    const bottom = top + attributeNumber(labelGroup, 'height');
    const overlapsArc = Array.from({ length: 146 }, (_, index) => index - 35).some(angle => {
      const radians = (angle * Math.PI) / 180;
      const x = 70 * Math.cos(radians);
      const y = 70 * Math.sin(radians);
      return x >= left && x <= right && y >= top && y <= bottom;
    });

    expect(overlapsArc).toBe(false);
  });
});
