import { describe, expect, it } from 'vitest';

import {
  getPreviewControlFields,
  getPreviewControlItems,
} from '../../src/modules/docs/components/component-preview/controls';
import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview/types';
import {
  createPreviewControlContract,
  previewControlContract as zhContract,
  texExtensionsControls as zhControls,
} from '../../src/modules/docs/contents/kernel/packages/tex/configuration/tex-extensions.controls';

const fieldContract = (controls: PreviewControlsDefinition) =>
  getPreviewControlItems(controls).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: 'defaultValue' in field ? field.defaultValue : undefined,
  }));

describe('TeX extensions 配置示例', () => {
  it('只提供公式示例可操作项', () => {
    expect(getPreviewControlFields(zhControls).map(field => field.id)).toEqual(['example']);
    expect(zhControls.sections).toHaveLength(1);
    expect(zhContract.canonicalValues).toEqual({ example: 'none' });
  });

  it('中英文保留相同的可操作控件', () => {
    const enContract = createPreviewControlContract('en');
    const enControls = enContract.controls;
    expect(fieldContract(enControls)).toEqual(fieldContract(zhControls));
    expect(enControls.sections).toHaveLength(1);
    expect(enContract.canonicalValues).toEqual(zhContract.canonicalValues);
    expect(enContract.relatedApis).toEqual(zhContract.relatedApis);
  });
});
