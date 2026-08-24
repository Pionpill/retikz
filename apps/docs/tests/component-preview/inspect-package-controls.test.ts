import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview/types';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as inspectSelectionContract } from '../../src/modules/docs/contents/kernel/packages/extension/inspect/inspect-selection.controls';
import { previewControlContract as inspectSelectionEnContract } from '../../src/modules/docs/contents/kernel/packages/extension/inspect/inspect-selection.en.controls';

const fieldContractOf = (definition: PreviewControlsDefinition) =>
  getPreviewControlFields(definition).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));

describe('@retikz/inspect selection playground controls', () => {
  it('keeps target, Inspector options, and barrier controls bilingual and stable', () => {
    const zhFields = fieldContractOf(inspectSelectionContract.controls);
    const enFields = fieldContractOf(inspectSelectionEnContract.controls);

    expect(inspectSelectionContract.controls.presentation).toBe('panel');
    expect(inspectSelectionEnContract.controls.presentation).toBe('panel');
    expect(enFields).toEqual(zhFields);
    expect(zhFields).toEqual([
      { id: 'target', kind: 'select', defaultValue: 'both', optionValues: ['left', 'right', 'both'] },
      { id: 'controlPoints', kind: 'switch', defaultValue: true, optionValues: undefined },
      { id: 'labels', kind: 'switch', defaultValue: true, optionValues: undefined },
      { id: 'barrierRight', kind: 'switch', defaultValue: false, optionValues: undefined },
    ]);
    expect(inspectSelectionEnContract.canonicalValues).toEqual(inspectSelectionContract.canonicalValues);
    expect(inspectSelectionContract.canonicalValues).toEqual({
      target: 'both',
      controlPoints: true,
      labels: true,
      barrierRight: false,
    });
    expect(inspectSelectionContract.relatedApis).toEqual([
      'InspectPath.request',
      'InspectScope.request',
      'StrokePathInspectOptionsInputSchema',
    ]);
    expect(inspectSelectionEnContract.relatedApis).toEqual(inspectSelectionContract.relatedApis);
  });
});
