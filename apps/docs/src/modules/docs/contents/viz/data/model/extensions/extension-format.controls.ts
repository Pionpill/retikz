import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { wanRows } from './extension-format.data';

/** 自定义格式示例的中文数据面板 */
export const extensionFormatControls = definePreviewControls({
  presentation: 'panel',
  title: '具名格式',
  sections: [{ label: '输入数据', controls: [{ kind: 'table', id: 'rows', label: '万元字符串', rows: wanRows }] }],
});

/** 自定义格式示例的稳定文档契约 */
export const previewControlContract = {
  controls: extensionFormatControls,
  canonicalValues: {},
  relatedApis: ['Plot.formatDefinitions', 'FieldFormatDefinition'],
} satisfies PreviewControlContract;
