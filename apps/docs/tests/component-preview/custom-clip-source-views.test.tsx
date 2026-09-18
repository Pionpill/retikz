import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildPreviewSource } from '../../src/modules/docs/components/component-preview/source-panel';
import * as clipRegistryDemoModule from '../../src/modules/docs/contents/kernel/components/scope/custom/clip-registry.demo';

describe('自定义裁剪区源码视图', () => {
  it('IR 与 Vanilla 视图都注入圆角矩形 Definition', () => {
    const result = buildPreviewSource({
      Component: clipRegistryDemoModule.default,
      previewSource: 'previewSource' in clipRegistryDemoModule ? clipRegistryDemoModule.previewSource : undefined,
      name: 'clip-registry',
      key: '../../contents/kernel/components/scope/custom/clip-registry.demo.tsx',
      segments: ['kernel', 'components', 'scope', 'custom'],
      rawSource: 'export default Demo;\n',
      sourceFiles: [],
      sourceContents: {},
      hideCode: false,
    });

    expect(renderToStaticMarkup(result.source?.ir?.render?.('svg'))).toContain('<svg');
    expect(result.source?.vanilla?.files[0]?.code).toContain("kind: 'rounded-rect'");
    expect(renderToStaticMarkup(result.source?.vanilla?.render?.('svg'))).toContain('<svg');
  });
});
