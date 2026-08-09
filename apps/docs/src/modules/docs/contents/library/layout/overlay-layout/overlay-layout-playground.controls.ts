import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createLayoutInspectionControls } from '../layout-inspection-controls';

/** OverlayLayout 辅助层的 family 开关 */
export const overlayLayoutInspectionFamilyControls = [
  { id: 'inspectPlacements', option: 'placements', label: '放置关系', recommended: false },
  { id: 'inspectAnchors', option: 'anchors', label: '定位锚点', recommended: false },
  { id: 'inspectStacking', option: 'stacking', label: '叠放顺序', recommended: false },
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
  familyControls: overlayLayoutInspectionFamilyControls,
});

/** OverlayLayout 局部定位的中文属性面板 */
export const overlayLayoutPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '叠加布局参数',
  sections: [
    ...inspectionControls.sections,
    {
      label: '共享对齐',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: '水平对齐',
          defaultValue: 'center',
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
    {
      label: '徽标定位',
      controls: [
        { kind: 'range', id: 'badgeX', label: '目标 x', defaultValue: 300, min: 20, max: 320, step: 10 },
        { kind: 'range', id: 'badgeY', label: '目标 y', defaultValue: 18, min: 10, max: 130, step: 10 },
        {
          kind: 'select',
          id: 'anchor',
          label: '锚点',
          defaultValue: 'top-right',
          options: [
            { value: 'top-left', label: '左上' },
            { value: 'center', label: '中心' },
            { value: 'top-right', label: '右上' },
          ],
        },
        { kind: 'range', id: 'zIndex', label: '叠放层级', defaultValue: 2, min: -1, max: 3, step: 1 },
      ],
    },
  ],
});

/** 当前 OverlayLayout playground 的稳定文档契约 */
const canonicalValues = {
  ...inspectionControls.canonicalValues,
  justifyItems: 'center',
  alignItems: 'center',
  badgeX: 300,
  badgeY: 18,
  anchor: 'top-right',
  zIndex: 2,
};

export const previewControlContract = {
  controls: overlayLayoutPlaygroundControls,
  stateOnlyIds: inspectionControls.stateOnlyIds,
  canonicalValues,
  presets: inspectionControls.presetsFor(canonicalValues),
  presetSelector: inspectionControls.presetSelector,
  relatedApis: [
    'OverlayLayout.inspect',
    'OverlayLayout.justifyItems',
    'OverlayLayout.alignItems',
    'LayoutItem.placement.at',
    'LayoutItem.placement.anchor',
    'LayoutItem.zIndex',
  ],
} satisfies PreviewControlContract;
