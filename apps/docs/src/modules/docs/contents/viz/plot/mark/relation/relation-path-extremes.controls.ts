import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { pathExtremeRelations } from './relation-path-extremes.data';

/** 路径极值关系 playground 的稳定控件 id */
export const RELATION_PATH_CONTROL_IDS = {
  anchor: 'relation-path-anchor',
  bendDirection: 'relation-path-bend-direction',
  bendAngle: 'relation-path-bend-angle',
  color: 'relation-path-color',
  strokeWidth: 'relation-path-stroke-width',
  labelPosition: 'relation-path-label-position',
  labelSide: 'relation-path-label-side',
} as const;

/** 路径极值关系的中文属性面板 */
export const relationPathExtremesControls = definePreviewControls({
  presentation: 'panel',
  title: '路径极值',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'pathExtremeRelations', label: '路径极值关系', rows: pathExtremeRelations }],
    },
    {
      label: '端点选择',
      controls: [
        {
          kind: 'select',
          id: RELATION_PATH_CONTROL_IDS.anchor,
          label: '极值字段',
          defaultValue: 'y',
          options: [
            { value: 'y', label: 'y 值' },
            { value: 'x', label: 'x 值' },
          ],
        },
      ],
    },
    {
      label: '关系样式',
      controls: [
        {
          kind: 'select',
          id: RELATION_PATH_CONTROL_IDS.bendDirection,
          label: '弯曲方向',
          defaultValue: 'left',
          options: [
            { value: 'left', label: '左侧' },
            { value: 'right', label: '右侧' },
          ],
        },
        {
          kind: 'range',
          id: RELATION_PATH_CONTROL_IDS.bendAngle,
          label: '弯曲角度',
          defaultValue: 32,
          min: 8,
          max: 72,
          step: 4,
        },
        {
          kind: 'color',
          id: RELATION_PATH_CONTROL_IDS.color,
          label: '关系颜色',
          defaultValue: '#f97316',
        },
        {
          kind: 'range',
          id: RELATION_PATH_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 1.6,
          min: 0.8,
          max: 4,
          step: 0.2,
        },
      ],
    },
    {
      label: '关系标签',
      controls: [
        {
          kind: 'range',
          id: RELATION_PATH_CONTROL_IDS.labelPosition,
          label: '路径位置',
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_PATH_CONTROL_IDS.labelSide,
          label: '相对路径方位',
          defaultValue: 'center',
          options: [
            { value: 'center', label: '居中（默认）' },
            { value: 'top', label: '上方' },
            { value: 'bottom', label: '下方' },
          ],
        },
      ],
    },
  ],
});

/** 路径极值关系 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: relationPathExtremesControls,
  canonicalValues: {
    [RELATION_PATH_CONTROL_IDS.anchor]: 'y',
    [RELATION_PATH_CONTROL_IDS.bendDirection]: 'left',
    [RELATION_PATH_CONTROL_IDS.bendAngle]: 32,
    [RELATION_PATH_CONTROL_IDS.color]: '#f97316',
    [RELATION_PATH_CONTROL_IDS.strokeWidth]: 1.6,
    [RELATION_PATH_CONTROL_IDS.labelPosition]: 0.5,
    [RELATION_PATH_CONTROL_IDS.labelSide]: 'center',
  },
  relatedApis: [
    'RelationMark.transform',
    'RelationMark.path.routing',
    'RelationMark.path.label',
    'RelationMark.path.label.side',
    'RelationMark.path.label.placement',
    'RelationMark.style',
  ],
} satisfies PreviewControlContract;
