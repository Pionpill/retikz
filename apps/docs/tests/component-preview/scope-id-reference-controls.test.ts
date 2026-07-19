import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';

import { scopeIdReferenceControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-id-reference.controls';
import { previewControlContract as scopeIdReferenceContract } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-id-reference.controls';
import { scopeIdReferenceEnControls } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-id-reference.en.controls';
import { previewControlContract as scopeIdReferenceEnContract } from '../../src/modules/docs/contents/kernel/components/layout/scope/scope-id-reference.en.controls';

const localizedControls: Array<readonly [string, PreviewControlsDefinition]> = [
  ['zh', scopeIdReferenceControls],
  ['en', scopeIdReferenceEnControls],
];

describe('Scope id reference controls', () => {
  it('只索引 controls 直接消费的 Scope 边界与 Draw 端点语义', () => {
    for (const contract of [scopeIdReferenceContract, scopeIdReferenceEnContract]) {
      expect(contract.relatedApis).toEqual(['Scope.boundingShape', 'Draw.way']);
    }
  });

  it.each(localizedControls)('%s 使用条件角度滑块而不是离散角度选项', (locale, controls) => {
    expect(controls.presentation).toBe('panel');
    if (controls.presentation !== 'panel') throw new Error(`Missing Scope panel controls: ${locale}`);

    const fields = controls.sections.flatMap(section => section.controls);
    const anchor = fields.find(field => field.id === 'anchor');
    const angle = fields.find(field => field.id === 'angleDegrees');

    expect(anchor).toMatchObject({
      kind: 'select',
      defaultValue: 'left',
      options: expect.arrayContaining([expect.objectContaining({ value: 'angle' })]),
    });
    if (!anchor || anchor.kind !== 'select') throw new Error(`Missing Scope anchor select: ${locale}`);
    expect(anchor.options.map(option => option.value)).not.toEqual(
      expect.arrayContaining(['0', '45', '90', '135', '180', '225', '270', '315']),
    );

    expect(angle).toMatchObject({
      kind: 'range',
      defaultValue: 180,
      min: 0,
      max: 360,
      step: 1,
      visibleWhen: { controlId: 'anchor', oneOf: ['angle'] },
    });
  });
});
