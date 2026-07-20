import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Star 节点连接 playground 使用的稳定字段 id */
export const StarNodeConnectionControlId = {
  SourceAngle: 'sourceAngle',
  SourceDistance: 'sourceDistance',
  CornerRadius: 'cornerRadius',
  Anchor: 'anchor',
  AnchorAngle: 'anchorAngle',
} as const;

/** 数字 anchor 仅在选择角度锚点时显示 */
export const StarNodeConnectionVisibleWhen = {
  AnchorAngle: { controlId: StarNodeConnectionControlId.Anchor, oneOf: ['angle'] },
} as const;

/** Star 节点连接的中文属性面板 */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '连接位置',
  sections: [
    {
      label: '目标节点',
      controls: [
        {
          kind: 'range',
          id: StarNodeConnectionControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 12,
          min: 0,
          max: 24,
          step: 1,
        },
        {
          kind: 'select',
          id: StarNodeConnectionControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动贴边' },
            { value: 'center', label: 'center' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'tip-0', label: 'tip-0' },
            { value: 'notch-0', label: 'notch-0' },
            { value: 'angle', label: '数字角度' },
          ],
        },
        {
          kind: 'range',
          id: StarNodeConnectionControlId.AnchorAngle,
          label: 'anchor 角度',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: StarNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: '来源节点',
      controls: [
        {
          kind: 'range',
          id: StarNodeConnectionControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: StarNodeConnectionControlId.SourceDistance,
          label: '轨道距离',
          defaultValue: 120,
          min: 90,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Star 节点连接 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { sourceAngle: -35, sourceDistance: 120, cornerRadius: 12, anchor: 'auto', anchorAngle: 45 },
  presets: [
    { id: 'sharp-tip', label: '尖角锚点', values: { cornerRadius: 0, anchor: 'tip-0' } },
    { id: 'rounded-notch', label: '圆角凹角锚点', values: { cornerRadius: 16, anchor: 'notch-0' } },
    { id: 'numeric-anchor', label: '数字锚点', values: { anchor: 'angle', anchorAngle: 135 } },
  ],
  relatedApis: ['Node.shape', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
