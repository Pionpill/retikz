import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scatterRelations } from './relation-scatter.data';

/** 散点关系 playground 的稳定控件 id */
export const RELATION_SCATTER_CONTROL_IDS = {
  routing: 'relation-scatter-routing',
  color: 'relation-scatter-color',
  strokeWidth: 'relation-scatter-stroke-width',
  opacity: 'relation-scatter-opacity',
  labelPosition: 'relation-scatter-label-position',
  labelSide: 'relation-scatter-label-side',
  labelSloped: 'relation-scatter-label-sloped',
  nodeLabelPosition: 'relation-scatter-node-label-position',
} as const;

/** 散点关系路径的中文属性面板 */
export const relationScatterControls = definePreviewControls({
  presentation: 'panel',
  title: '散点关系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'scatterRelations', label: '散点关系', rows: scatterRelations }],
    },
    {
      label: '关系样式',
      controls: [
        {
          kind: 'select',
          id: RELATION_SCATTER_CONTROL_IDS.routing,
          label: '路由方式',
          defaultValue: 'line',
          options: [
            { value: 'line', label: '直线' },
            { value: 'bend', label: '弯曲' },
            { value: 'orthogonal', label: '正交' },
          ],
        },
        {
          kind: 'color',
          id: RELATION_SCATTER_CONTROL_IDS.color,
          label: '关系颜色',
          defaultValue: '#64748b',
        },
        {
          kind: 'range',
          id: RELATION_SCATTER_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 1.1,
          min: 0.5,
          max: 4,
          step: 0.1,
        },
        {
          kind: 'range',
          id: RELATION_SCATTER_CONTROL_IDS.opacity,
          label: '透明度',
          defaultValue: 0.55,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Path 标签',
      controls: [
        {
          kind: 'range',
          id: RELATION_SCATTER_CONTROL_IDS.labelPosition,
          label: 'Path 上的位置',
          defaultValue: 0.45,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_SCATTER_CONTROL_IDS.labelSide,
          label: '相对 Path 方位',
          defaultValue: 'center',
          options: [
            { value: 'center', label: '居中（默认）' },
            { value: 'top', label: '上方' },
            { value: 'bottom', label: '下方' },
          ],
        },
        {
          kind: 'switch',
          id: RELATION_SCATTER_CONTROL_IDS.labelSloped,
          label: '沿 Path 倾斜',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Node 标签',
      controls: [
        {
          kind: 'select',
          id: RELATION_SCATTER_CONTROL_IDS.nodeLabelPosition,
          label: 'Node 标签方位',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上方' },
            { value: 'right', label: '右侧' },
            { value: 'bottom', label: '下方' },
            { value: 'left', label: '左侧' },
          ],
        },
      ],
    },
  ],
});

/** 散点关系 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: relationScatterControls,
  canonicalValues: {
    [RELATION_SCATTER_CONTROL_IDS.routing]: 'line',
    [RELATION_SCATTER_CONTROL_IDS.color]: '#64748b',
    [RELATION_SCATTER_CONTROL_IDS.strokeWidth]: 1.1,
    [RELATION_SCATTER_CONTROL_IDS.opacity]: 0.55,
    [RELATION_SCATTER_CONTROL_IDS.labelPosition]: 0.45,
    [RELATION_SCATTER_CONTROL_IDS.labelSide]: 'center',
    [RELATION_SCATTER_CONTROL_IDS.labelSloped]: true,
    [RELATION_SCATTER_CONTROL_IDS.nodeLabelPosition]: 'top',
  },
  relatedApis: [
    'RelationMark.path',
    'RelationMark.path.label.side',
    'RelationMark.path.label.placement',
    'RelationMark.style',
    'PointMark.labelPosition',
  ],
} satisfies PreviewControlContract;
