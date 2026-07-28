import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EnglishDemo from '@/modules/docs/contents/viz/data/transform/data-transform-shape.en.demo';
import ChineseDemo from '@/modules/docs/contents/viz/data/transform/data-transform-shape.zh.demo';

const transformRoot = resolve(process.cwd(), 'src/modules/docs/contents/viz/data/transform');

const readRequiredFile = (name: string): string => readFileSync(resolve(transformRoot, name), 'utf8');

describe('Data transform overview', () => {
  it('uses a bilingual hidden-code figure to compare input and transformed table shapes', () => {
    const chinesePage = readRequiredFile('index.zh.mdx');
    const englishPage = readRequiredFile('index.en.mdx');

    const previewMarkup =
      '<ComponentPreview files="data-transform-shape" size="sm" previewClassName="!p-3" hideCode />';
    expect(chinesePage).toContain(previewMarkup);
    expect(englishPage).toContain(previewMarkup);
    expect(existsSync(resolve(transformRoot, 'data-transform-shape.zh.demo.tsx'))).toBe(true);
    expect(existsSync(resolve(transformRoot, 'data-transform-shape.en.demo.tsx'))).toBe(true);

    const figureSource = readRequiredFile('data-transform-shape.tsx');
    expect(figureSource).toContain('<DetailTable');
    expect(figureSource).not.toContain('ManualTable');
    expect(figureSource).not.toContain('Array<IRTableCell>');
    expect(figureSource).not.toContain('const valueCell');
    expect(figureSource).toContain('const headerCell');
    expect(figureSource).toContain("fill: 'lightgray'");
    expect(figureSource).toContain("font: { size: 12, weight: 'bold' }");
    expect(figureSource).toContain('id="source-caption"');
    expect(figureSource).toContain('textColor="gray"');
    expect(figureSource).not.toContain('id="source-title"');
    expect(figureSource).toContain('summarize');
  });

  it('renders localized input and result tables through the real embedded Table pipeline', () => {
    const chineseSvg = renderToStaticMarkup(createElement(ChineseDemo));
    const englishSvg = renderToStaticMarkup(createElement(EnglishDemo));

    expect(chineseSvg).toContain('规范化明细');
    expect(chineseSvg).toContain('分组汇总');
    expect(chineseSvg).toContain('东部');
    expect(englishSvg).toContain('Canonical detail');
    expect(englishSvg).toContain('Grouped summary');
    expect(englishSvg).toContain('East');
    expect(chineseSvg).toContain('summarize');
    expect(englishSvg).toContain('summarize');
  });
});
