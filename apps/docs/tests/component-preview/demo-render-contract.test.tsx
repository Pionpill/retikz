import type { FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PreviewThemeProvider } from '../../src/modules/docs/components/component-preview/theme';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource as frameSource } from '../../src/modules/docs/contents/library/standard/presentation/frame/frame-playground.demo';
import { previewSource as gridSource } from '../../src/modules/docs/contents/library/standard/presentation/grid/grid-playground.demo';
import { previewSource as flowSource } from '../../src/modules/docs/contents/schematic/diagram/flow/usage/flow-presentation';
import { previewSource as connectedSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.zh.demo';
import { previewSource as gapsSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-gaps';
import DataTransformShape from '../../src/modules/docs/contents/viz/data/transform/data-transform-shape.zh.demo';
import { previewSource as cartesianSource } from '../../src/modules/docs/contents/viz/plot/mark/point/point-jitter';

/** 从作者的 canonical 配置执行真实的预览编译链 */
const cases: Array<{ name: string; Component: FC }> = [
  { name: 'Grid 辅助线', Component: () => gridSource.canonicalRender?.() ?? null },
  { name: 'Frame 边框', Component: () => frameSource.canonicalRender?.() ?? null },
  { name: 'Flow 图例', Component: () => flowSource.canonicalRender?.() ?? null },
  { name: 'Connected Scatter 路径', Component: () => connectedSource.canonicalRender?.() ?? null },
  { name: 'Connected Scatter 缺口连接', Component: () => gapsSource.canonicalRender() },
  { name: '直角坐标 jitter', Component: () => cartesianSource.canonicalRender?.() ?? null },
];

describe('Docs canonical demo 渲染契约', () => {
  it('逻辑图的嵌套 Table 通过主题解析并渲染内容', () => {
    const markup = renderToStaticMarkup(
      <PreviewThemeProvider>
        <DataTransformShape />
      </PreviewThemeProvider>,
    );
    expect(markup).toContain('<svg');
    expect(markup).toContain('summarize');
  });
  it.each(cases)('$name 的实际配置可生成绘图产物', ({ Component }) => {
    const preview = buildPreviewIR(Component);
    const output = buildVanillaPreview(preview);
    expect(output.svg, output.code).toContain('<svg');
    expect(output.svg).toMatch(/<(?:path|text|rect|circle|g)\b/);
    expect(output.code).not.toMatch(/Cannot generate|Failed to generate/);
  });
});
