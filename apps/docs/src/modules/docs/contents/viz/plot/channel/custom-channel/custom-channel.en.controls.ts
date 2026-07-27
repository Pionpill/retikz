import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { customChannelPoints } from './custom-channel.data';

/** Stable control ids for the custom-channel playground */
export const CUSTOM_CHANNEL_CONTROL_IDS = {
  bindingMode: 'custom-channel-binding-mode',
  constantIntensity: 'custom-channel-constant-intensity',
} as const;

/** English panel for the custom channel */
export const customChannelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom channel',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-channel-points',
          label: 'Points',
          rows: customChannelPoints,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'score' }],
        },
      ],
    },
    {
      label: 'intensity binding',
      controls: [
        {
          kind: 'select',
          id: CUSTOM_CHANNEL_CONTROL_IDS.bindingMode,
          label: 'Value source',
          defaultValue: 'field',
          options: [
            { value: 'field', label: 'Bind the score field' },
            { value: 'constant', label: 'Use a constant' },
          ],
        },
        {
          kind: 'range',
          id: CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity,
          label: 'Constant opacity',
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

/** Stable documentation contract for the custom-channel playground */
export const previewControlContract = {
  controls: customChannelControls,
  canonicalValues: {
    [CUSTOM_CHANNEL_CONTROL_IDS.bindingMode]: 'field',
    [CUSTOM_CHANNEL_CONTROL_IDS.constantIntensity]: 0.65,
  },
  relatedApis: ['PointMark.channels'],
} satisfies PreviewControlContract;
