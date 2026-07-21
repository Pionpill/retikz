import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Scope 裁剪 playground 使用的稳定字段 id */
export const ScopeClipControlId = {
  ClipKind: 'clipKind',
} as const;

/** Scope 裁剪区的中文属性面板 */
export const scopeClipControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope clip',
  sections: [
    {
      label: '输出边界',
      controls: [
        {
          kind: 'select',
          id: ScopeClipControlId.ClipKind,
          label: 'clip 类型',
          defaultValue: 'circle',
          options: [
            { value: 'rect', label: '矩形' },
            { value: 'circle', label: '圆形' },
            { value: 'ellipse', label: '椭圆' },
            { value: 'polygon', label: '多边形' },
            { value: 'path', label: '路径' },
            { value: 'compound', label: '复合' },
          ],
        },
      ],
    },
  ],
});

/** Scope 裁剪面板的稳定文档契约 */
export const previewControlContract = {
  controls: scopeClipControls,
  canonicalValues: { clipKind: 'circle' },
  relatedApis: ['Scope.clip'],
} satisfies PreviewControlContract;
