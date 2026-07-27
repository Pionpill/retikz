import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { grid } from './coordinate-custom-bridge.data';

/** 自定义坐标系 playground 的稳定控件 id */
export const CUSTOM_COORDINATE_CONTROL_IDS = {
  archHeight: 'custom-coordinate-arch-height',
} as const;

/** 自定义坐标系的中文属性面板 */
export const customCoordinateControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义坐标系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-coordinate-grid',
          label: '规则网格',
          rows: grid,
          columns: [{ key: 'x' }, { key: 'y' }],
        },
      ],
    },
    {
      label: '投影参数',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_COORDINATE_CONTROL_IDS.archHeight,
          label: '拱高',
          defaultValue: 60,
          min: 0,
          max: 100,
          step: 5,
        },
      ],
    },
  ],
});

/** 自定义坐标系 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: customCoordinateControls,
  canonicalValues: { [CUSTOM_COORDINATE_CONTROL_IDS.archHeight]: 60 },
  relatedApis: ['Plot.coordinate'],
} satisfies PreviewControlContract;
