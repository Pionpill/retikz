import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createLayoutInspectionControls } from '../layout-inspection-controls';

/** FlexLayout 辅助层的 family 开关 */
export const flexLayoutInspectionFamilyControls = [
  { id: 'inspectLines', option: 'lines', label: 'Flex 行区域', recommended: true },
  { id: 'inspectGaps', option: 'gaps', label: '固定 gap', recommended: true },
  { id: 'inspectDistributedSpace', option: 'distributedSpace', label: '分布自由空间边界', recommended: false },
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
  familyControls: flexLayoutInspectionFamilyControls,
});

/** FlexLayout 关键分配行为的中文属性面板 */
export const flexLayoutPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '弹性布局参数',
  sections: [
    ...inspectionControls.sections,
    {
      label: '方向与换行',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: '主轴方向',
          defaultValue: 'row',
          options: [
            { value: 'row', label: '横向' },
            { value: 'row-reverse', label: '横向反转' },
            { value: 'column', label: '纵向' },
            { value: 'column-reverse', label: '纵向反转' },
          ],
        },
        {
          kind: 'select',
          id: 'wrap',
          label: '换行',
          defaultValue: 'wrap',
          options: [
            { value: 'nowrap', label: '不换行' },
            { value: 'wrap', label: '换行' },
            { value: 'wrap-reverse', label: '反向换行' },
          ],
        },
      ],
    },
    {
      label: '对齐与分配',
      controls: [
        {
          kind: 'select',
          id: 'alignItems',
          label: '交叉轴对齐',
          defaultValue: 'center',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'stretch', label: '拉伸' },
          ],
        },
        { kind: 'range', id: 'basis', label: '基础尺寸', defaultValue: 92, min: 52, max: 150, step: 2 },
        { kind: 'range', id: 'grow', label: 'A 的伸展系数', defaultValue: 1, min: 0, max: 4, step: 1 },
        { kind: 'range', id: 'shrink', label: 'B 的收缩系数', defaultValue: 1, min: 0, max: 4, step: 1 },
      ],
    },
  ],
});

/** 当前 FlexLayout playground 的稳定文档契约 */
const canonicalValues = {
  ...inspectionControls.canonicalValues,
  direction: 'row',
  wrap: 'wrap',
  alignItems: 'center',
  basis: 92,
  grow: 1,
  shrink: 1,
};

export const previewControlContract = {
  controls: flexLayoutPlaygroundControls,
  stateOnlyIds: inspectionControls.stateOnlyIds,
  canonicalValues,
  presets: inspectionControls.presetsFor(canonicalValues),
  presetSelector: inspectionControls.presetSelector,
  relatedApis: [
    'FlexLayout.inspect',
    'FlexLayout.direction',
    'FlexLayout.wrap',
    'FlexLayout.alignItems',
    'LayoutItem.basis',
    'LayoutItem.grow',
    'LayoutItem.shrink',
  ],
} satisfies PreviewControlContract;
