import { compileToScene } from '@retikz/core';
import { RibbonPathDefinition } from '@retikz/extension';
import { normalizeScene, path, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderRibbonCustomCapPreview } from '../../src/modules/docs/contents/library/extension/ribbon/custom/ribbon-custom-cap.preview';
import { svg as customCapSvg } from '../../src/modules/docs/contents/library/extension/ribbon/custom/ribbon-custom-cap.vanilla';
import { renderRibbonCustomProfilePreview } from '../../src/modules/docs/contents/library/extension/ribbon/custom/ribbon-custom-profile.preview';
import { svg as customProfileSvg } from '../../src/modules/docs/contents/library/extension/ribbon/custom/ribbon-custom-profile.vanilla';
import { renderRibbonEndpointsPreview } from '../../src/modules/docs/contents/library/extension/ribbon/extended/ribbon-endpoints.preview';
import RibbonBasicDemo from '../../src/modules/docs/contents/library/extension/ribbon/usage/ribbon-basic.demo';

describe('Ribbon 的 Vanilla 预览', () => {
  it('通过 React 和 Vanilla 编写保留独立的端点方向', () => {
    const preview = buildPreviewIR(() =>
      renderRibbonEndpointsPreview({
        centerline: 'line',
        align: 'center',
        cap: 'butt',
        width: 30,
        arcAngle: 120,
        startDirection: 'angle',
        startAngle: 90,
        endDirection: 'angle',
        endAngle: 105,
      }),
    );
    const vanilla = scene({
      children: [
        path({
          kind: 'ribbon',
          kindOptions: {
            width: { kind: 'fixed', value: 30 },
            align: 'center',
            start: { cap: { name: 'butt' }, direction: 90 },
            end: { cap: { name: 'butt' }, direction: 105 },
            sampling: { kind: 'fixed', samples: 64 },
          },
          children: [
            { type: 'step', kind: 'move', to: [-190, 20] },
            { type: 'step', kind: 'line', to: [190, 20] },
          ],
        }),
      ],
    });
    const compile = (ir: typeof preview.ir) =>
      compileToScene(ir, { paths: [RibbonPathDefinition] }).scene.primitives.find(p => p.type === 'path');
    const reactPath = compile(preview.ir);

    expect(reactPath?.type).toBe('path');

    if (reactPath?.type !== 'path') throw new Error('Expected path');

    const vanillaPath = compile(normalizeScene(vanilla).ir);
    if (vanillaPath?.type !== 'path') throw new Error('Expected Vanilla path');

    expect(reactPath.commands).toEqual(vanillaPath.commands);
    expect(reactPath.commands[0]).toEqual({ kind: 'move', to: [-190, 35] });

    const rendered = buildVanillaPreview(preview);

    expect(rendered.code).toContain('direction: 90');
    expect(rendered.code).toContain('direction: 105');
    expect(rendered.svg).toContain('<path');
  });

  it('React 预览和显式 Vanilla 编写方式均可渲染自定义端帽', () => {
    const automatic = buildVanillaPreview(buildPreviewIR(() => renderRibbonCustomCapPreview({ depth: 24 })));

    expect(automatic.svg).toContain('<path');
    expect(customCapSvg).toContain('<path');
    expect(automatic.svg).toContain('-174');
    expect(customCapSvg).toContain('-174');
  });

  it('将 React 演示 Path 携带到生成的源和 SVG 渲染中', () => {
    const preview = buildPreviewIR(RibbonBasicDemo);

    expect(preview.paths).toEqual([RibbonPathDefinition]);

    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain("import { RibbonPathDefinition } from '@retikz/extension';");
    expect(vanilla.code).toContain('paths: [RibbonPathDefinition]');
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('<path');
  });

  it('从显式 Vanilla 源码渲染自定义轮廓', () => {
    expect(customProfileSvg).toContain('<svg');
    expect(customProfileSvg).toContain('<path');

    const automatic = buildVanillaPreview(
      buildPreviewIR(() => renderRibbonCustomProfilePreview({ base: 10, peak: 42 })),
    );

    expect(automatic.svg).toContain('<svg');
    expect(automatic.code).toContain('Cannot generate Vanilla source for Path "ribbon"');
  });
});
