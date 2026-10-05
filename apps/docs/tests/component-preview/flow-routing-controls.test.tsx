import { FlowDiagramSchema } from '@retikz/diagram/flow';
import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { createPreviewControlContract as createBendControls } from '../../src/modules/docs/contents/schematic/diagram/flow/extended/flow-bend.controls';
import { renderFlowBendPreview } from '../../src/modules/docs/contents/schematic/diagram/flow/extended/flow-bend.preview';
import { createPreviewControlContract } from '../../src/modules/docs/contents/schematic/diagram/flow/usage/flow-routing.controls';
import { renderFlowRoutingPreview } from '../../src/modules/docs/contents/schematic/diagram/flow/usage/flow-routing.preview';

describe('Flow routing controls', () => {
  it('keeps automatic bend compact and tangent fields exclusive in real Source', () => {
    const values = createPreviewControlContract().canonicalValues;

    expect(createPreviewControlContract('en').canonicalValues).toEqual(values);

    const preview = buildPreviewIR(() => renderFlowRoutingPreview(values));

    expect(FlowDiagramSchema.parse(preview.sourceIr.children[0]).relations?.[0].routing).toEqual({ kind: 'bend' });

    const explicitThirty = buildPreviewIR(() =>
      renderFlowRoutingPreview({ ...values, configuration: 'symmetric', angle: 30 }),
    );

    expect(FlowDiagramSchema.parse(explicitThirty.sourceIr.children[0]).relations?.[0].routing).toEqual({
      kind: 'bend',
      bendAngle: 30,
    });

    const tangent = buildPreviewIR(() =>
      renderFlowRoutingPreview({ ...values, configuration: 'tangent', side: 'right', angle: 60 }),
    );

    expect(FlowDiagramSchema.parse(tangent.sourceIr.children[0]).relations?.[0].routing).toEqual({
      kind: 'bend',
      outAngle: 0,
      inAngle: 180,
      looseness: 1,
    });
    expect(buildVanillaPreview(preview).svg).toMatch(/d="M[^"]*C /);
  });

  it.each(['zh', 'en'] as const)('forwards exposed label controls in %s', lang => {
    const values = { ...createBendControls(lang).canonicalValues, position: 0.2, sloped: false, interrupt: false };
    const preview = buildPreviewIR(() => renderFlowBendPreview(values, lang));

    expect(FlowDiagramSchema.parse(preview.sourceIr.children[0]).relations?.[0].routing).toEqual({ kind: 'bend' });

    const manual = buildPreviewIR(() => renderFlowBendPreview({ ...values, autoAngle: false, angle: 0 }, lang));

    expect(FlowDiagramSchema.parse(manual.sourceIr.children[0]).relations?.[0].routing).toEqual({
      kind: 'bend',
      bendAngle: 0,
    });
    expect(FlowDiagramSchema.parse(preview.sourceIr.children[0]).relations?.[0].label).toMatchObject({
      position: 0.2,
      sloped: false,
      interrupt: false,
    });
    expect(buildVanillaPreview(preview).svg).toContain('<svg');
  });
});
