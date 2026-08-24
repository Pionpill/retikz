import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { chartPresentationData } from './chart-presentation.data';

/** Chart presentation shorthand 的中文显隐控制面板 */
export const chartPresentationVisibilityControls = definePreviewControls({
  presentation: 'panel',
  title: '展示内容',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'chart-title-data', label: '散点数据', rows: chartPresentationData }],
    },
    {
      label: '展示内容',
      controls: [
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showTitle,
          label: '显示标题',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showSubtitle,
          label: '显示副标题',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showNote,
          label: '显示备注',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.showSource,
          label: '显示来源',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Chart presentation 显隐 playground 的稳定文档契约 */
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
