import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { customChannelPoints } from './custom-channel.data';

/** 自定义通道 playground 的稳定控件 id */
export const CUSTOM_CHANNEL_CONTROL_IDS = {
  bindingMode: 'custom-channel-binding-mode',
  constantIntensity: 'custom-channel-constant-intensity',
} as const;

/** 自定义通道的中文属性面板 */
export const customChannelControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义通道',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-channel-points',
          label: '散点数据',
          rows: customChannelPoints,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'score' }],
        },
      ],
    },
    {
      label: 'intensity 绑定',
      controls: [
        {
          kind: 'select',
          id: CUSTOM_CHANNEL_CONTROL_IDS.bindingMode,
          label: '取值方式',
          defaultValue: 'field',
          options: [
            { value: 'field', label: '绑定 score 字段' },
            { value: 'constant', label: '使用固定值' },
          ],
        },
        {
          kind: 'range',
          id: CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity,
          label: '固定透明度',
          defaultValue: 0.65,
          min: 0.3,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: CUSTOM_CHANNEL_CONTROL_IDS.bindingMode, oneOf: ['constant'] },
        },
      ],
    },
  ],
});

/** 自定义通道 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: customChannelControls,
  canonicalValues: {
    [CUSTOM_CHANNEL_CONTROL_IDS.bindingMode]: 'field',
    [CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity]: 0.65,
  },
  relatedApis: ['PointMark.channels'],
} satisfies PreviewControlContract;
