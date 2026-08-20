import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CHART_PRESENTATION_CONTROL_IDS } from './chart-presentation.constants';
import { chartPresentationData } from './chart-presentation.data';

/** Chart presentation 内部 Flex 布局的中文控制面板 */
export const chartPresentationLayoutControls = definePreviewControls({
  presentation: 'panel',
  title: '整图展示布局',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'chart-presentation-data', label: '散点数据', rows: chartPresentationData }],
    },
    {
      label: '布局检查',
      controls: [
        {
          kind: 'switch',
          id: CHART_PRESENTATION_CONTROL_IDS.inspect,
          label: '显示 Flex 辅助层',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Chart presentation 布局 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: chartPresentationLayoutControls,
  canonicalValues: { [CHART_PRESENTATION_CONTROL_IDS.inspect]: true },
  relatedApis: ['LayoutInspectLayout.request'],
} satisfies PreviewControlContract;
