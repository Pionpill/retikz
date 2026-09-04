import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Flow 分组排布 demo 的稳定 control id */
export const FlowCompoundControlId = {
  GroupDirection: 'groupDirection',
  GroupNodeGap: 'groupNodeGap',
  GroupRankGap: 'groupRankGap',
  LayoutDirection: 'layoutDirection',
  LayoutGap: 'layoutGap',
  LayoutAlign: 'layoutAlign',
} as const;

type FlowCompoundControlOption = Readonly<{
  value: string;
  label: string;
}>;

type FlowCompoundControlCopy = Readonly<{
  title: string;
  groupSection: string;
  groupDirectionLabel: string;
  directionOptions: ReadonlyArray<FlowCompoundControlOption>;
  groupNodeGapLabel: string;
  groupRankGapLabel: string;
  layoutSection: string;
  layoutDirectionLabel: string;
  layoutGapLabel: string;
  layoutAlignLabel: string;
  alignOptions: ReadonlyArray<FlowCompoundControlOption>;
}>;

/** 建立双语同构的 Flow 分组排布 controls 契约 */
export const defineFlowCompoundControlContract = (copy: FlowCompoundControlCopy) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        label: copy.groupSection,
        controls: [
          {
            kind: 'select',
            id: FlowCompoundControlId.GroupDirection,
            label: copy.groupDirectionLabel,
            defaultValue: 'right',
            options: copy.directionOptions,
          },
          {
            kind: 'range',
            id: FlowCompoundControlId.GroupNodeGap,
            label: copy.groupNodeGapLabel,
            defaultValue: 20,
            min: 12,
            max: 32,
            step: 4,
          },
          {
            kind: 'range',
            id: FlowCompoundControlId.GroupRankGap,
            label: copy.groupRankGapLabel,
            defaultValue: 36,
            min: 24,
            max: 48,
            step: 4,
          },
        ],
      },
      {
        label: copy.layoutSection,
        controls: [
          {
            kind: 'select',
            id: FlowCompoundControlId.LayoutDirection,
            label: copy.layoutDirectionLabel,
            defaultValue: 'right',
            options: copy.directionOptions,
          },
          {
            kind: 'range',
            id: FlowCompoundControlId.LayoutGap,
            label: copy.layoutGapLabel,
            defaultValue: 24,
            min: 12,
            max: 32,
            step: 4,
          },
          {
            kind: 'select',
            id: FlowCompoundControlId.LayoutAlign,
            label: copy.layoutAlignLabel,
            defaultValue: 'center',
            options: copy.alignOptions,
          },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: {
      groupDirection: 'right',
      groupNodeGap: 20,
      groupRankGap: 36,
      layoutDirection: 'right',
      layoutGap: 24,
      layoutAlign: 'center',
    },
    relatedApis: [
      'FlowGroup.layout.direction',
      'FlowGroup.layout.nodeGap',
      'FlowGroup.layout.rankGap',
      'FlowLayout.direction',
      'FlowLayout.gap',
      'FlowLayout.align',
    ],
  } satisfies PreviewControlContract;
};

/** Flow 分组排布 demo 的中文 controls 契约 */
export const previewControlContract = defineFlowCompoundControlContract({
  title: '分组排布',
  groupSection: '可见 Group',
  groupDirectionLabel: '自动布局方向',
  directionOptions: [
    { value: 'up', label: '向上' },
    { value: 'right', label: '向右' },
    { value: 'down', label: '向下' },
    { value: 'left', label: '向左' },
  ],
  groupNodeGapLabel: '同层间距',
  groupRankGapLabel: '层级间距',
  layoutSection: '无外壳 Layout',
  layoutDirectionLabel: '固定排列方向',
  layoutGapLabel: '元素间距',
  layoutAlignLabel: '交叉轴对齐',
  alignOptions: [
    { value: 'start', label: '起点' },
    { value: 'center', label: '居中' },
    { value: 'end', label: '终点' },
  ],
});

/** Flow 分组排布 demo 的中文 controls */
export const flowCompoundControls = previewControlContract.controls;
