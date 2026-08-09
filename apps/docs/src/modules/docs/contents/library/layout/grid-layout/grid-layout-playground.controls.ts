import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createLayoutInspectionControls } from '../layout-inspection-controls';

/** GridLayout 辅助层的 family 开关 */
export const gridLayoutInspectionFamilyControls = [
  { id: 'inspectTracks', option: 'tracks', label: '轨道边界', recommended: true },
  { id: 'inspectCells', option: 'cells', label: '单元格边界', recommended: false },
  { id: 'inspectGaps', option: 'gaps', label: '固定 gap', recommended: true },
  { id: 'inspectDistributedSpace', option: 'distributedSpace', label: '分布自由空间边界', recommended: false },
  { id: 'inspectSpans', option: 'spans', label: '跨轨道标记', recommended: false },
] as const;

const inspectionControls = createLayoutInspectionControls({
  labels: {
    details: '辅助层细节',
    container: '容器边界',
    content: '内容边界',
    padding: 'Padding 区域',
    slot: '槽位边界',
    margin: 'Margin 区域',
    allocation: '分配边界',
    visual: '视觉边界',
    overflow: '溢出警告',
    alignmentGuides: '对齐参考线',
    labels: '文字标签',
    preset: '辅助层预设',
    custom: '自定义',
    recommended: '推荐',
    all: '全部',
    off: '关闭',
  },
  familyControls: gridLayoutInspectionFamilyControls,
});

/** GridLayout 轨道分配的中文属性面板 */
export const gridLayoutPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '网格布局参数',
  sections: [
    ...inspectionControls.sections,
    {
      label: '轨道与自动放置',
      controls: [
        {
          kind: 'select',
          id: 'autoFlow',
          label: '自动放置方向',
          defaultValue: 'row',
          options: [
            { value: 'row', label: '按行' },
            { value: 'column', label: '按列' },
          ],
        },
        { kind: 'range', id: 'fraction', label: '第二列份额', defaultValue: 2, min: 1, max: 4, step: 1 },
        { kind: 'range', id: 'columnGap', label: '列间距', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'rowGap', label: '行间距', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: '单元格对齐',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: '水平对齐',
          defaultValue: 'stretch',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'stretch', label: '拉伸' },
          ],
        },
        {
          kind: 'select',
          id: 'alignItems',
          label: '垂直对齐',
          defaultValue: 'center',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'stretch', label: '拉伸' },
          ],
        },
      ],
    },
  ],
});

/** 当前 GridLayout playground 的稳定文档契约 */
const canonicalValues = {
  ...inspectionControls.canonicalValues,
  autoFlow: 'row',
  fraction: 2,
  columnGap: 8,
  rowGap: 8,
  justifyItems: 'stretch',
  alignItems: 'center',
};

export const previewControlContract = {
  controls: gridLayoutPlaygroundControls,
  stateOnlyIds: inspectionControls.stateOnlyIds,
  canonicalValues,
  presets: inspectionControls.presetsFor(canonicalValues),
  presetSelector: inspectionControls.presetSelector,
  relatedApis: [
    'GridLayout.inspect',
    'GridLayout.autoFlow',
    'GridLayout.columns',
    'GridLayout.columnGap',
    'GridLayout.rowGap',
    'GridLayout.justifyItems',
    'GridLayout.alignItems',
  ],
} satisfies PreviewControlContract;
