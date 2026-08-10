import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SCATTER_BASIC_CONTROL_IDS } from './scatter-basic.controls';
import { vehicleScatterData } from './scatter-basic.data';

/** 基础 Scatter 的英文控制面板 */
export const scatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scatter plot',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Vehicle samples',
          rows: vehicleScatterData,
          columns: [
            { key: 'model', label: 'Model' },
            { key: 'weight', label: 'Weight' },
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'power', label: 'Power' },
            { key: 'group', label: 'Group' },
          ],
        },
      ],
    },
    {
      label: 'Points',
      controls: [
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointSize,
          label: 'Size',
          defaultValue: 10,
          min: 6,
          max: 18,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_BASIC_CONTROL_IDS.pointOpacity,
          label: 'Opacity',
          defaultValue: 0.82,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'switch',
          id: SCATTER_BASIC_CONTROL_IDS.colorByGroup,
          label: 'Color by group',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 基础 Scatter 的英文稳定文档契约 */
export const previewControlContract = {
  controls: scatterBasicControls,
  canonicalValues: {
    [SCATTER_BASIC_CONTROL_IDS.pointSize]: 10,
    [SCATTER_BASIC_CONTROL_IDS.pointOpacity]: 0.82,
    [SCATTER_BASIC_CONTROL_IDS.colorByGroup]: true,
  },
  relatedApis: ['PointMark.size', 'PointMark.opacity', 'PointMark.color'],
} satisfies PreviewControlContract;
