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
    {
      label: 'Presentation',
      controls: [
        { kind: 'switch', id: CHART_PRESENTATION_CONTROL_IDS.showTitle, label: 'Show title', defaultValue: true },
        { kind: 'switch', id: CHART_PRESENTATION_CONTROL_IDS.showSubtitle, label: 'Show subtitle', defaultValue: true },
        { kind: 'switch', id: CHART_PRESENTATION_CONTROL_IDS.showNote, label: 'Show note', defaultValue: true },
        { kind: 'switch', id: CHART_PRESENTATION_CONTROL_IDS.showSource, label: 'Show source', defaultValue: true },
      ],
    },
  ],
});

/** Chart presentation 布局 playground 的稳定英文文档契约 */
export const previewControlContract = {
  controls: chartPresentationLayoutControls,
  canonicalValues: {
    [CHART_PRESENTATION_CONTROL_IDS.inspect]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showTitle]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showSubtitle]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showNote]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showSource]: true,
  },
  relatedApis: ['Chart.title', 'Chart.subtitle', 'Chart.note', 'Chart.source'],
} satisfies PreviewControlContract;
