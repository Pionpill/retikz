import { compileToScene } from '@retikz/core';
import { RibbonPathKindDefinition } from '@retikz/extension';
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

describe('Ribbon Vanilla preview', () => {
  it('preserves independent endpoint directions through React and Vanilla authoring', () => {
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
      compileToScene(ir, { pathKinds: [RibbonPathKindDefinition] }).scene.primitives.find(p => p.type === 'path');
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

  it('renders custom caps through both React preview and explicit Vanilla authoring', () => {
    const automatic = buildVanillaPreview(buildPreviewIR(() => renderRibbonCustomCapPreview({ depth: 24 })));

    expect(automatic.svg).toContain('<path');
    expect(customCapSvg).toContain('<path');
    expect(automatic.svg).toContain('-174');
    expect(customCapSvg).toContain('-174');
  });

  it('carries the React demo Path kind into both generated source and SVG rendering', () => {
    const preview = buildPreviewIR(RibbonBasicDemo);

    expect(preview.pathKinds).toEqual([RibbonPathKindDefinition]);

    const vanilla = buildVanillaPreview(preview);

    expect(vanilla.code).toContain("import { RibbonPathKindDefinition } from '@retikz/extension';");
    expect(vanilla.code).toContain('pathKinds: [RibbonPathKindDefinition]');
    expect(vanilla.code).not.toContain('Failed to generate Vanilla preview');
    expect(vanilla.svg).toContain('<svg');
    expect(vanilla.svg).toContain('<path');
  });

  it('renders the custom profile from its explicit Vanilla source', () => {
    expect(customProfileSvg).toContain('<svg');
    expect(customProfileSvg).toContain('<path');

    const automatic = buildVanillaPreview(
      buildPreviewIR(() => renderRibbonCustomProfilePreview({ base: 10, peak: 42 })),
    );

    expect(automatic.svg).toContain('<svg');
    expect(automatic.code).toContain('Cannot generate Vanilla source for Path kind "ribbon"');
  });
});
