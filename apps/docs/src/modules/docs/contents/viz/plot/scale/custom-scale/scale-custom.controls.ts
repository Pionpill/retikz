import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scaleCustomRows } from './scale-custom.data';

/** 自定义比例尺 playground 的稳定控件 id */
export const CUSTOM_SCALE_CONTROL_IDS = {
  exponent: 'custom-scale-exponent',
} as const;

/** 自定义比例尺的中文属性面板 */
export const customScaleControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义比例尺',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-scale-rows',
          label: '散点数据',
          rows: scaleCustomRows,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'tier', label: '等级' }],
        },
      ],
    },
    {
      label: 'ease-position',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_SCALE_CONTROL_IDS.exponent,
          label: '指数',
          defaultValue: 1.8,
          min: 0.6,
          max: 3,
          step: 0.2,
        },
      ],
    },
  ],
});

/** 自定义比例尺 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: customScaleControls,
  canonicalValues: { [CUSTOM_SCALE_CONTROL_IDS.exponent]: 1.8 },
  relatedApis: ['Plot.spec'],
} satisfies PreviewControlContract;
