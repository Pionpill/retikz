import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Node anchor-to-anchor playground 使用的稳定字段 id */
export const NodeAnchorPositionControlId = {
  TargetAnchor: 'targetAnchor',
  TargetMargin: 'targetMargin',
  TargetRotate: 'targetRotate',
  SelfAnchor: 'selfAnchor',
  OffsetX: 'offsetX',
  OffsetY: 'offsetY',
  SelfScale: 'selfScale',
  SelfRotate: 'selfRotate',
} as const;

const anchorOptions = [
  { value: 'center', label: 'center' },
  { value: 'top', label: 'top' },
  { value: 'top-right', label: 'top-right' },
  { value: 'right', label: 'right' },
  { value: 'bottom-right', label: 'bottom-right' },
  { value: 'bottom', label: 'bottom' },
  { value: 'bottom-left', label: 'bottom-left' },
  { value: 'left', label: 'left' },
  { value: 'top-left', label: 'top-left' },
] as const;

/** Node 锚点对齐定位的中文属性面板 */
export const nodeAnchorPositionControls = definePreviewControls({
  presentation: 'panel',
  title: '锚点对齐',
  sections: [
    {
      label: '目标 Node',
      controls: [
        {
          kind: 'select',
          id: NodeAnchorPositionControlId.TargetAnchor,
          label: '目标锚点',
          defaultValue: 'center',
          options: anchorOptions,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.TargetMargin,
          label: '外边距',
          defaultValue: 0,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.TargetRotate,
          label: '旋转角度',
          defaultValue: 0,
          min: -45,
          max: 45,
          step: 3,
        },
      ],
    },
    {
      label: '当前 Node',
      controls: [
        {
          kind: 'select',
          id: NodeAnchorPositionControlId.SelfAnchor,
          label: '自身锚点',
          defaultValue: 'center',
          options: anchorOptions,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.OffsetX,
          label: '水平偏移',
          defaultValue: 0,
          min: -80,
          max: 80,
          step: 4,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.OffsetY,
          label: '垂直偏移',
          defaultValue: 0,
          min: -80,
          max: 80,
          step: 4,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.SelfScale,
          label: '缩放比例',
          defaultValue: 1,
          min: 0.5,
          max: 1.8,
          step: 0.1,
        },
        {
          kind: 'range',
          id: NodeAnchorPositionControlId.SelfRotate,
          label: '旋转角度',
          defaultValue: 0,
          min: -45,
          max: 45,
          step: 3,
        },
      ],
    },
  ],
});

/** Node 锚点对齐面板的稳定文档契约 */
export const previewControlContract = {
  controls: nodeAnchorPositionControls,
  canonicalValues: {
    targetAnchor: 'center',
    targetMargin: 0,
    targetRotate: 0,
    selfAnchor: 'center',
    offsetX: 0,
    offsetY: 0,
    selfScale: 1,
    selfRotate: 0,
  },
  presets: [
    {
      id: 'corner-offset',
      label: '角点 + offset',
      values: {
        targetAnchor: 'bottom-left',
        targetMargin: 8,
        targetRotate: 12,
        selfAnchor: 'top-left',
        offsetX: 18,
        offsetY: -8,
        selfScale: 1,
        selfRotate: -10,
      },
    },
    {
      id: 'transformed',
      label: '变换后对齐',
      values: {
        targetAnchor: 'right',
        targetMargin: 16,
        targetRotate: 30,
        selfAnchor: 'left',
        offsetX: 24,
        offsetY: 0,
        selfScale: 1.4,
        selfRotate: -25,
      },
    },
  ],
  relatedApis: ['Node.position', 'Node.margin', 'Node.scale', 'Node.rotate'],
} satisfies PreviewControlContract;
