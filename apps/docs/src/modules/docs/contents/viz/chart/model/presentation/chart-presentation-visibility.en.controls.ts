import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { chartPresentationData } from './chart-presentation.data';

/** Chart presentation shorthand 的英文显隐控制面板 */
export const chartPresentationVisibilityControls = definePreviewControls({
  presentation: 'panel',
  title: 'Presentation content',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'chart-title-data', label: 'Point rows', rows: chartPresentationData }],
    },
    {
      label: 'Presentation content',
      controls: [
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showTitle,
          label: 'Show title',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showSubtitle,
          label: 'Show subtitle',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showNote,
          label: 'Show note',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showSource,
          label: 'Show source',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Chart presentation 显隐 playground 的稳定英文文档契约 */
export const previewControlContract = {
  controls: chartPresentationVisibilityControls,
  canonicalValues: {
    [CHART_PRESENTATION_CONTROL_IDS.showTitle]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showSubtitle]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showNote]: true,
    [CHART_PRESENTATION_CONTROL_IDS.showSource]: true,
  },
  relatedApis: ['Chart.title', 'Chart.subtitle', 'Chart.note', 'Chart.source'],
} satisfies PreviewControlContract;
