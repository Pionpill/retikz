import { describe, expect, it } from 'vitest';

import {
  getRequiredTexExtensionControlId,
  isTexExtensionControlActive,
  TexExtensionsControlId,
} from '../../src/modules/docs/contents/kernel/packages/extension/tex/tex-extensions.controls';

describe('TeX 拓展示例所需扩展', () => {
  it('基础示例不要求追加扩展，拓展示例映射到对应开关', () => {
    expect(getRequiredTexExtensionControlId('none')).toBeUndefined();
    expect(getRequiredTexExtensionControlId('cases')).toBe(TexExtensionsControlId.Cases);
    expect(getRequiredTexExtensionControlId('color')).toBe(TexExtensionsControlId.Color);
  });

  it('示例所需扩展会立即生效，并保留用户手动启用的扩展', () => {
    const values = {
      example: 'cancel' as const,
      cancel: false,
      color: true,
      ams: false,
    };

    expect(isTexExtensionControlActive(values, TexExtensionsControlId.Cancel)).toBe(true);
    expect(isTexExtensionControlActive(values, TexExtensionsControlId.Color)).toBe(true);
    expect(isTexExtensionControlActive(values, TexExtensionsControlId.Ams)).toBe(false);
  });
});
