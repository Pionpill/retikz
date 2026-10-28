import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import EnglishDemo from '@/modules/docs/contents/viz/data/transform/data-transform-shape.en.demo';
import ChineseDemo from '@/modules/docs/contents/viz/data/transform/data-transform-shape.zh.demo';

describe('数据转换概述', () => {
  it('通过真正的嵌入式 Table 管线渲染本地化的输入和结果表', () => {
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
