import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { matrix } from './rect-heatmap.data';

/** 矩形边界 playground 的稳定控件 id */
export const RECT_BOUNDS_MODE_ID = 'rect-bounds-mode';
export const RECT_BOUNDS_SHOW_COLOR_ID = 'rect-bounds-show-color';

/** 矩形边界来源的中文属性面板 */
export const rectBoundsControls = definePreviewControls({
  presentation: 'panel',
  title: '矩形边界',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'matrix', label: '热图矩阵', rows: matrix }],
    },
    {
      label: '边界来源',
      controls: [
        {
          kind: 'select',
          id: RECT_BOUNDS_MODE_ID,
          label: '纵向边界',
          defaultValue: 'band',
          options: [
            { value: 'band', label: '分类带宽' },
            { value: 'full', label: '完整范围' },
          ],
        },
        {
          kind: 'switch',
          id: RECT_BOUNDS_SHOW_COLOR_ID,
          label: '映射颜色',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 矩形边界 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: rectBoundsControls,
  canonicalValues: {
    [RECT_BOUNDS_MODE_ID]: 'band',
    [RECT_BOUNDS_SHOW_COLOR_ID]: true,
  },
  relatedApis: ['IntervalMark.bounds', 'IntervalMark.color'],
} satisfies PreviewControlContract;
