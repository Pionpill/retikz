import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { customChannelPoints } from './custom-channel.data';
import { customChannelI18n } from './custom-channel.i18n';

/** 自定义通道 playground 的稳定控件 id */
export const CUSTOM_CHANNEL_CONTROL_IDS = {
  bindingMode: 'custom-channel-binding-mode',
  constantIntensity: 'custom-channel-constant-intensity',
} as const;

/** 按语言创建自定义通道的控件契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = customChannelI18n[lang];
  const customChannelControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: false,
        controls: [
          {
            kind: 'table',
            id: 'custom-channel-points',
            label: i18n.points,
            rows: customChannelPoints,
            columns: [{ key: 'x' }, { key: 'y' }, { key: 'score' }],
          },
        ],
      },
      {
        label: i18n.binding,
        controls: [
          {
            kind: 'select',
            id: CUSTOM_CHANNEL_CONTROL_IDS.bindingMode,
            label: i18n.source,
            defaultValue: 'field',
            options: [
              { value: 'field', label: i18n.field },
              { value: 'constant', label: i18n.constant },
            ],
          },
          {
            kind: 'range',
            id: CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity,
            label: i18n.opacity,
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
  return {
    controls: customChannelControls,
    canonicalValues: {
      [CUSTOM_CHANNEL_CONTROL_IDS.bindingMode]: 'field',
      [CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity]: 0.65,
    },
    relatedApis: ['PointMark.channels'],
  } satisfies PreviewControlContract;
};
