import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { matrix } from './rect-heatmap.data';

/** 矩形边界 playground 的稳定控件 id */
export const RECT_BOUNDS_MODE_ID = 'rect-bounds-mode';
export const RECT_BOUNDS_SHOW_COLOR_ID = 'rect-bounds-show-color';
export const RECT_BOUNDS_COORDINATE_ID = 'interval-cell-coordinate';

/** 矩形边界来源的中文属性面板 */
export const rectBoundsControls = definePreviewControls({
  presentation: 'panel',
  title: '二维 cell',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'matrix', label: '热图矩阵', rows: matrix }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: RECT_BOUNDS_COORDINATE_ID,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
    },
    {
      label: '边界来源',
      controls: [
        {
          kind: 'select',
          id: RECT_BOUNDS_MODE_ID,
          label: 'y 边界',
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
    [RECT_BOUNDS_COORDINATE_ID]: 'cartesian2D',
    [RECT_BOUNDS_MODE_ID]: 'band',
    [RECT_BOUNDS_SHOW_COLOR_ID]: true,
  },
  relatedApis: ['Plot.coordinate', 'IntervalMark.bounds', 'IntervalMark.color'],
} satisfies PreviewControlContract;
