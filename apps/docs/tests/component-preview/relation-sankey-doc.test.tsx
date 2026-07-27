import type { IRScope } from '@retikz/core';
import type { FC } from 'react';

import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource } from '../../src/modules/docs/contents/viz/plot/mark/relation/relation-sankey.demo';

const CanonicalSankey: FC = () => previewSource.canonicalRender?.();

const numericAttribute = (tag: string, name: string): number => Number(new RegExp(`${name}="([^"]+)"`).exec(tag)?.[1]);

describe('桑基带状关系文档 demo', () => {
  it('为顶部悬浮控件预留至少 52 个 user units', () => {
    const preview = buildPreviewIR(CanonicalSankey);
    const svg = buildVanillaPreview(preview).svg ?? '';
    const plotScope = preview.ir.children.find(
      (child): child is IRScope => child.type === 'scope' && 'children' in child,
    );
    const plotTranslate = plotScope?.transforms?.find(transform => transform.kind === 'translate');
    const nodeTop = Math.min(
      ...[...svg.matchAll(/<rect\b[^>]*>/g)]
        .map(match => match[0])
        .filter(
          tag =>
            tag.includes('stroke="#ffffff"') &&
            numericAttribute(tag, 'width') > 0 &&
            numericAttribute(tag, 'height') > 0,
        )
        .map(tag => numericAttribute(tag, 'y')),
    );
    const plotOffsetY = plotTranslate?.kind === 'translate' ? plotTranslate.y : Number.NaN;

    expect(preview.ir.viewBox).toEqual({ x: 0, y: 0, width: 620, height: 360 });
    expect(plotTranslate).toMatchObject({ kind: 'translate', x: 0, y: 42 });
    expect(nodeTop + plotOffsetY - (preview.ir.viewBox?.y ?? Number.NaN)).toBeGreaterThanOrEqual(52);
  });

  it('固定节点宽度并保留流量对应的节点高度', () => {
    const preview = buildPreviewIR(CanonicalSankey);
    const svg = buildVanillaPreview(preview).svg ?? '';
    const nodeRects = [...svg.matchAll(/<rect\b[^>]*>/g)]
      .map(match => match[0])
      .filter(tag => tag.includes('stroke="#ffffff"'))
      .map(tag => ({ width: numericAttribute(tag, 'width'), height: numericAttribute(tag, 'height') }))
      .filter(size => size.width > 0 && size.height > 0);

    expect(nodeRects.map(size => size.width)).toEqual(Array.from({ length: 14 }, () => 8));
    expect(nodeRects.map(size => size.height)).toEqual([28, 16, 26, 8, 18, 26, 20, 16, 16, 52, 62, 60, 84, 90]);
  });
});
