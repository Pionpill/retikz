import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LayoutViewboxDemo from '../../src/modules/docs/contents/kernel/components/layout/usage/layout-viewbox.demo';

describe('Layout 自动边界示例', () => {
  it('按内容边界输出等比例尺寸并保留两个节点', () => {
    const markup = renderToStaticMarkup(createElement(LayoutViewboxDemo));
    const svg = markup.match(/^<svg\b[^>]*>/)?.[0];
    const viewBox = svg
      ?.match(/viewBox="([^"]+)"/)?.[1]
      .split(' ')
      .map(Number);

    expect(viewBox).toHaveLength(4);
    expect(viewBox![0]).toBeLessThan(0);
    expect(viewBox![1]).toBeLessThan(0);
    expect(viewBox![0] + viewBox![2]).toBeGreaterThan(70);
    expect(viewBox![1] + viewBox![3]).toBeGreaterThan(70);
    expect(svg).toContain(`width="${viewBox![2]}"`);
    expect(svg).toContain(`height="${viewBox![3]}"`);
    expect(markup).toContain('data-retikz-id="o"');
    expect(markup).toContain('data-retikz-id="c"');
  });
});
