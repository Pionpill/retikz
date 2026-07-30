import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { bubbleNodes } from './relation-bubble.data';

/** 气泡关系 playground 的稳定控件 id */
export const RELATION_BUBBLE_CONTROL_IDS = {
  color: 'relation-bubble-color',
  strokeWidth: 'relation-bubble-stroke-width',
  labelPosition: 'relation-bubble-label-position',
  labelSide: 'relation-bubble-label-side',
  labelSloped: 'relation-bubble-label-sloped',
  nodeLabelPosition: 'relation-bubble-node-label-position',
  nodeOpacity: 'relation-bubble-node-opacity',
} as const;

/** 气泡极值关系 operation */
export const relationBubbleOperation = {
  kind: 'relate',
  source: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
  target: { selector: { kind: 'max', by: 'y' }, fields: { id: 'id' } },
  measures: [{ op: 'difference', field: 'y', as: 'delta', labelAs: 'relLabel', labelPrefix: 'lift +' }],
} as const;

/** 气泡关系样式的中文属性面板 */
export const relationBubbleControls = definePreviewControls({
  presentation: 'panel',
  title: '气泡关系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'bubbleNodes',
          label: '气泡节点',
          views: createPlotTransformTableViews(
            { source: '原始', result: '关系层配对后' },
            bubbleNodes,
            () => relationBubbleOperation,
          ),
        },
      ],
    },
    {
      label: '关系样式',
      controls: [
        {
          kind: 'color',
          id: RELATION_BUBBLE_CONTROL_IDS.color,
          label: '关系颜色',
          defaultValue: '#e11d48',
        },
        {
          kind: 'range',
          id: RELATION_BUBBLE_CONTROL_IDS.strokeWidth,
          label: '线宽',
          defaultValue: 1.6,
          min: 0.8,
          max: 4,
          step: 0.4,
        },
      ],
    },
    {
      label: '关系标签',
      controls: [
        {
          kind: 'range',
          id: RELATION_BUBBLE_CONTROL_IDS.labelPosition,
          label: '路径位置',
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
        },
        {
          kind: 'select',
          id: RELATION_BUBBLE_CONTROL_IDS.labelSide,
          label: '相对路径方位',
          defaultValue: 'center',
          options: [
            { value: 'center', label: '居中（默认）' },
            { value: 'top', label: '上方' },
            { value: 'bottom', label: '下方' },
          ],
        },
        {
          kind: 'switch',
          id: RELATION_BUBBLE_CONTROL_IDS.labelSloped,
          label: '沿路径倾斜',
          defaultValue: true,
        },
      ],
    },
    {
      label: '气泡节点',
      controls: [
        {
          kind: 'select',
          id: RELATION_BUBBLE_CONTROL_IDS.nodeLabelPosition,
          label: '标签方位',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上方' },
            { value: 'right', label: '右侧' },
            { value: 'bottom', label: '下方' },
            { value: 'left', label: '左侧' },
          ],
        },
        {
          kind: 'range',
          id: RELATION_BUBBLE_CONTROL_IDS.nodeOpacity,
          label: '填充透明度',
          defaultValue: 0.68,
          min: 0.2,
          max: 1,
          step: 0.04,
        },
      ],
    },
  ],
});

/** 气泡关系 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: relationBubbleControls,
  canonicalValues: {
    [RELATION_BUBBLE_CONTROL_IDS.color]: '#e11d48',
    [RELATION_BUBBLE_CONTROL_IDS.strokeWidth]: 1.6,
    [RELATION_BUBBLE_CONTROL_IDS.labelPosition]: 0.5,
    [RELATION_BUBBLE_CONTROL_IDS.labelSide]: 'center',
    [RELATION_BUBBLE_CONTROL_IDS.labelSloped]: true,
    [RELATION_BUBBLE_CONTROL_IDS.nodeLabelPosition]: 'top',
    [RELATION_BUBBLE_CONTROL_IDS.nodeOpacity]: 0.68,
  },
  relatedApis: [
    'RelationMark.style',
    'RelationMark.path.label',
    'RelationMark.path.label.side',
    'RelationMark.path.label.placement',
    'PointMark.labelPosition',
    'PointMark.fillOpacity',
  ],
} satisfies PreviewControlContract;
