import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview/types';

import { previewControlContract as primitiveModelContract } from '../../src/modules/docs/contents/kernel/concepts/core/primitive-model/primitive-model-playground.controls';
import { previewControlContract as primitiveModelEnContract } from '../../src/modules/docs/contents/kernel/concepts/core/primitive-model/primitive-model-playground.en.controls';
import { previewControlContract as primitiveRelationsContract } from '../../src/modules/docs/contents/kernel/concepts/core/primitive-relations/primitive-relations-playground.controls';
import { previewControlContract as primitiveRelationsEnContract } from '../../src/modules/docs/contents/kernel/concepts/core/primitive-relations/primitive-relations-playground.en.controls';

const fieldContractOf = (definition: PreviewControlsDefinition) => {
  const fields =
    definition.presentation === 'panel'
      ? definition.sections.flatMap(section => section.controls)
      : definition.controls;

  return fields.map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    multiline: field.kind === 'text' ? field.multiline : undefined,
    visibleWhen: field.visibleWhen,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));
};

describe('core concept playground controls', () => {
  it.each([
    {
      name: 'primitive-model-playground',
      zhContract: primitiveModelContract,
      enContract: primitiveModelEnContract,
      ids: ['shape', 'content', 'boundary', 'fit', 'gap', 'fill', 'stroke', 'strokeWidth', 'sourceAngle'],
      canonicalValues: {
        shape: 'star',
        content: 'Primitive\nNode',
        boundary: 'circle',
        fit: 'tight',
        gap: 0,
        fill: '#fbbf24',
        stroke: '#b45309',
        strokeWidth: 2,
        sourceAngle: -30,
      },
      shapeValues: ['rectangle', 'circle', 'ellipse', 'diamond', 'polygon', 'star', 'sector', 'arc'],
      boundaryValues: ['shape', 'circle', 'rectangle', 'ellipse'],
      relatedApis: [
        'Node.children',
        'Node.shape',
        'Node.boundary',
        'Node.fill',
        'Node.stroke',
        'Node.strokeWidth',
        'Draw.way',
        'IRBoundary.params.fit',
        'IRBoundary.params.gap',
      ],
    },
    {
      name: 'primitive-relations-playground',
      zhContract: primitiveRelationsContract,
      enContract: primitiveRelationsEnContract,
      ids: ['anchor', 'anchorAngle', 'boundaryOverride', 'sourceAngle'],
      canonicalValues: { anchor: 'auto', anchorAngle: 45, boundaryOverride: 'inherit', sourceAngle: -35 },
      shapeValues: undefined,
      boundaryValues: undefined,
      relatedApis: ['Draw.way', 'IRNodeTarget.anchor', 'IRNodeTarget.boundary'],
    },
  ])('$name 提供稳定且双语一致的面板契约', playground => {
    const { zhContract, enContract } = playground;

    expect(zhContract.controls.presentation).toBe('panel');
    expect(enContract.controls.presentation).toBe('panel');
    expect(fieldContractOf(zhContract.controls)).toEqual(fieldContractOf(enContract.controls));
    expect(fieldContractOf(zhContract.controls).map(field => field.id)).toEqual(playground.ids);
    const shapeField = fieldContractOf(zhContract.controls).find(field => field.id === 'shape');
    expect(shapeField?.optionValues).toEqual(playground.shapeValues);
    if (playground.name === 'primitive-model-playground') {
      const fields = fieldContractOf(zhContract.controls);
      expect(fields.find(field => field.id === 'content')?.multiline).toBe(true);
      expect(fields.find(field => field.id === 'boundary')?.optionValues).toEqual(playground.boundaryValues);
      expect(fields.find(field => field.id === 'fit')?.visibleWhen).toEqual({
        controlId: 'boundary',
        oneOf: ['circle', 'ellipse'],
      });
      expect(fields.find(field => field.id === 'gap')?.visibleWhen).toEqual({
        controlId: 'boundary',
        oneOf: ['circle', 'rectangle', 'ellipse'],
      });
    }
    expect(zhContract.canonicalValues).toEqual(playground.canonicalValues);
    expect(enContract.canonicalValues).toEqual(playground.canonicalValues);
    expect(enContract.presets.map(preset => ({ id: preset.id, values: preset.values }))).toEqual(
      zhContract.presets.map(preset => ({ id: preset.id, values: preset.values })),
    );
    expect(zhContract.relatedApis).toEqual(playground.relatedApis);
    expect(enContract.relatedApis).toEqual(playground.relatedApis);
  });
});
