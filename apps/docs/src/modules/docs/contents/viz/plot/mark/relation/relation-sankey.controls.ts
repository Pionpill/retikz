import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sankeyRelations } from './relation-sankey.data';

/** 桑基 ribbon playground 的稳定控件 id */
export const RELATION_SANKEY_CONTROL_IDS = {
  samples: 'relation-sankey-samples',
  opacity: 'relation-sankey-opacity',
  nodeStrokeWidth: 'relation-sankey-node-stroke-width',
  nodeLabelPosition: 'relation-sankey-node-label-position',
  nodeLabelDistance: 'relation-sankey-node-label-distance',
} as const;

/** 桑基 ribbon 的中文属性面板 */
export const relationSankeyControls = definePreviewControls({
  presentation: 'panel',
  title: '桑基关系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'sankeyRelations', label: '桑基关系', rows: sankeyRelations }],
    },
    {
      label: 'Ribbon',
      controls: [
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.samples,
          label: '采样点数',
          defaultValue: 48,
          min: 8,
          max: 80,
          step: 8,
        },
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.opacity,
          label: '填充透明度',
          defaultValue: 0.5,
          min: 0.2,
          max: 0.9,
          step: 0.1,
        },
      ],
    },
    {
      label: '节点',
      controls: [
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.nodeStrokeWidth,
          label: '描边宽度',
          defaultValue: 0.9,
          min: 0,
          max: 3,
          step: 0.1,
        },
        {
          kind: 'select',
          id: RELATION_SANKEY_CONTROL_IDS.nodeLabelPosition,
          label: '标签方位',
          defaultValue: 'left',
          options: [
            { value: 'left', label: '左侧' },
            { value: 'right', label: '右侧' },
            { value: 'top', label: '上方' },
            { value: 'bottom', label: '下方' },
          ],
        },
        {
          kind: 'range',
          id: RELATION_SANKEY_CONTROL_IDS.nodeLabelDistance,
          label: '标签距离',
          defaultValue: 10,
          min: 0,
          max: 24,
          step: 1,
        },
      ],
    },
  ],
});

/** 桑基 ribbon playground 的稳定文档契约 */
export const previewControlContract = {
  controls: relationSankeyControls,
  canonicalValues: {
    [RELATION_SANKEY_CONTROL_IDS.samples]: 48,
    [RELATION_SANKEY_CONTROL_IDS.opacity]: 0.5,
    [RELATION_SANKEY_CONTROL_IDS.nodeStrokeWidth]: 0.9,
    [RELATION_SANKEY_CONTROL_IDS.nodeLabelPosition]: 'left',
    [RELATION_SANKEY_CONTROL_IDS.nodeLabelDistance]: 10,
  },
  relatedApis: [
    'RelationMark.ribbon',
    'RelationMark.style',
    'IntervalMark.strokeWidth',
    'IntervalMark.labelPosition',
    'IntervalMark.labelDistance',
  ],
} satisfies PreviewControlContract;
