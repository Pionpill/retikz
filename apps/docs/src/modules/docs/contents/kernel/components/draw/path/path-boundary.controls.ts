import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Path 端点连接面 playground 使用的稳定字段 id */
export const PathBoundaryControlId = {
  Boundary: 'boundary',
  Fit: 'fit',
  Gap: 'gap',
} as const;

/** 当前 playground 仅在圆形连接面下展示 fit / gap 参数 */
export const PathBoundaryVisibleWhen = {
  RegularBoundary: { controlId: PathBoundaryControlId.Boundary, oneOf: ['circle'] },
} as const;

/** Path 端点连接面的中文属性面板 */
export const pathBoundaryControls = definePreviewControls({
  presentation: 'panel',
  title: '端点连接面',
  sections: [
    {
      label: '端点',
      controls: [
        {
          kind: 'select',
          id: PathBoundaryControlId.Boundary,
          label: '连接面',
          defaultValue: 'circle',
          options: [
            { value: 'shape', label: '星形轮廓' },
            { value: 'circle', label: '圆形连接面' },
          ],
        },
        {
          kind: 'select',
          id: PathBoundaryControlId.Fit,
          label: 'fit',
          defaultValue: 'tight',
          options: [
            { value: 'tight', label: '贴合形状' },
            { value: 'bounds', label: '包住外接框' },
          ],
          visibleWhen: PathBoundaryVisibleWhen.RegularBoundary,
        },
        {
          kind: 'range',
          id: PathBoundaryControlId.Gap,
          label: 'gap',
          defaultValue: 0,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: PathBoundaryVisibleWhen.RegularBoundary,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: pathBoundaryControls,
  canonicalValues: { boundary: 'circle', fit: 'tight', gap: 0 },
  relatedApis: ['Draw.way', 'IRNodeTarget.boundary', 'IRBoundary.params.fit', 'IRBoundary.params.gap'],
} satisfies PreviewControlContract;
