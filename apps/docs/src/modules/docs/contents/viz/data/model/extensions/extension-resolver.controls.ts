import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { quarterlyRows } from './extension-resolver.data';

/** 运行时字段解析示例的中文数据面板 */
export const extensionResolverControls = definePreviewControls({
  presentation: 'panel',
  title: '运行时解析',
  sections: [{ label: '输入数据', controls: [{ kind: 'table', id: 'rows', label: '季度数据', rows: quarterlyRows }] }],
});

/** 运行时字段解析示例的稳定文档契约 */
export const previewControlContract = {
  controls: extensionResolverControls,
  canonicalValues: {},
  relatedApis: ['Plot.resolveField', 'ResolveField'],
} satisfies PreviewControlContract;
