import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { chartPresentationData } from './chart-presentation.data';

/** Chart presentation 内部 Flex 布局的英文控制面板 */
export const chartPresentationLayoutControls = definePreviewControls({
  presentation: 'panel',
  title: 'Chart presentation layout',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'chart-presentation-data', label: 'Point rows', rows: chartPresentationData }],
    },
    {
      label: 'Layout inspection',
      controls: [
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.inspect,
          label: 'Show Flex overlay',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Chart presentation 布局 playground 的稳定英文文档契约 */
export const previewControlContract = {
  controls: chartPresentationLayoutControls,
  canonicalValues: { [CHART_PRESENTATION_CONTROL_IDS.inspect]: true },
  relatedApis: ['LayoutInspectLayout.request'],
} satisfies PreviewControlContract;
