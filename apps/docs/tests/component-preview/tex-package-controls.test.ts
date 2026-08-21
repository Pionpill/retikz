import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
} from '../../src/modules/docs/components/component-preview/types';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as texPlaygroundContract } from '../../src/modules/docs/contents/kernel/packages/extension/tex/tex-playground.controls';
import { previewControlContract as texPlaygroundEnContract } from '../../src/modules/docs/contents/kernel/packages/extension/tex/tex-playground.en.controls';

const fieldContractOf = (definition: PreviewControlsDefinition) => {
  const fields = getPreviewControlFields(definition);

  return fields.map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    multiline: field.kind === 'text' ? field.multiline : undefined,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    visibleWhen: field.visibleWhen,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));
};

const presetContractOf = (contract: PreviewControlContract) =>
  contract.presets?.map(preset => ({ id: preset.id, values: preset.values })) ?? [];

describe('@retikz/tex package playground controls', () => {
  it('提供完整且双语一致的面板契约', () => {
    const zhFields = fieldContractOf(texPlaygroundContract.controls);
    const enFields = fieldContractOf(texPlaygroundEnContract.controls);

    expect(texPlaygroundContract.controls.presentation).toBe('panel');
    expect(texPlaygroundEnContract.controls.presentation).toBe('panel');
    expect(enFields).toEqual(zhFields);
    expect(zhFields.map(field => field.id)).toEqual(['source', 'displayMode', 'fontSize']);
    expect(texPlaygroundEnContract.canonicalValues).toEqual(texPlaygroundContract.canonicalValues);
    expect(texPlaygroundContract.presetSelector).toEqual({
      label: '公式示例',
      customLabel: '自定义',
    });
    expect(texPlaygroundEnContract.presetSelector).toEqual({
      label: 'Formula example',
      customLabel: 'Custom',
    });
    expect(presetContractOf(texPlaygroundEnContract)).toEqual(presetContractOf(texPlaygroundContract));
    expect(presetContractOf(texPlaygroundContract).map(preset => preset.id)).toEqual([
      'inline-energy',
      'display-sum',
      'multiline-derivatives',
    ]);
    expect(texPlaygroundContract.presets.every(preset => Object.keys(preset.values).length === 3)).toBe(true);
    expect(texPlaygroundContract.presets.find(preset => preset.id === 'display-sum')?.values).toEqual(
      texPlaygroundContract.canonicalValues,
    );
    expect(texPlaygroundContract.relatedApis).toEqual([
      'Node.text',
      'IRTexContent.tex',
      'IRTexContent.displayMode',
      'Node.font',
    ]);
    expect(texPlaygroundEnContract.relatedApis).toEqual(texPlaygroundContract.relatedApis);
  });
});
