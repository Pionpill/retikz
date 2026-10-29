import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { createPreviewControlContract } from '../../src/modules/docs/contents/kernel/packages/inspect/builtins/inspect-quadratic.controls';

describe('Inspect 路径检查控件', () => {
  it('中英文公开同一组几何与检查参数，Reset 默认值一致', () => {
    const zh = createPreviewControlContract('zh');
    const en = createPreviewControlContract('en');
    const fields = getPreviewControlFields(zh.controls);
    expect(fields.map(field => ({ ...field, label: '' }))).toEqual(
      getPreviewControlFields(en.controls).map(field => ({ ...field, label: '' })),
    );
    expect(en.canonicalValues).toEqual(zh.canonicalValues);
    expect(fields.filter(field => field.kind === 'switch').map(field => field.id)).toEqual([
      'controlPoints',
      'vertices',
      'labels',
    ]);
  });
});
