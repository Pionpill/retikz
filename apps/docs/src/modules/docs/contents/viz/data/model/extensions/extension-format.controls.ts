import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { thousandsRows } from './extension-format.data';

/** 自定义格式示例的中文数据面板 */
export const extensionFormatControls = definePreviewControls({
  presentation: 'panel',
  title: '具名格式',
  sections: [{ controls: [{ kind: 'table', id: 'rows', label: 'K 后缀字符串', rows: thousandsRows }] }],
});

/** 自定义格式示例的稳定文档契约 */
export const previewControlContract = {
  controls: extensionFormatControls,
  canonicalValues: {},
  relatedApis: ['Plot.formatDefinitions', 'FieldFormatDefinition'],
} satisfies PreviewControlContract;
