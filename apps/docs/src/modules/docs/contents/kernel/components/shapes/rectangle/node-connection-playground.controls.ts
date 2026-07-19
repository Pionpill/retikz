import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** 矩形节点连接 playground 使用的稳定字段 id */
export const RectangleNodeConnectionControlId = {
  SourceAngle: 'sourceAngle',
  SourceDistance: 'sourceDistance',
  CornerRadius: 'cornerRadius',
  Anchor: 'anchor',
  AnchorAngle: 'anchorAngle',
} as const;

/** 数字 anchor 仅在选择角度锚点时显示 */
export const RectangleNodeConnectionVisibleWhen = {
  AnchorAngle: { controlId: RectangleNodeConnectionControlId.Anchor, oneOf: ['angle'] },
} as const;

/** 矩形节点连接的中文属性面板 */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '连接位置',
  sections: [
    {
      label: '目标节点',
      controls: [
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 14,
          min: 0,
          max: 32,
          step: 1,
        },
        {
          kind: 'select',
          id: RectangleNodeConnectionControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动贴边' },
            { value: 'center', label: 'center' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'angle', label: '数字角度' },
          ],
        },
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.AnchorAngle,
          label: 'anchor 角度',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: RectangleNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: '来源节点',
      controls: [
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.SourceDistance,
          label: '轨道距离',
          defaultValue: 105,
          min: 80,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** 矩形节点连接 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { sourceAngle: -35, sourceDistance: 105, cornerRadius: 14, anchor: 'auto', anchorAngle: 45 },
  presets: [
    { id: 'square-auto', label: '直角自动贴边', values: { cornerRadius: 0, sourceAngle: 45, anchor: 'auto' } },
    { id: 'numeric-anchor', label: '数字锚点', values: { anchor: 'angle', anchorAngle: 135 } },
  ],
  relatedApis: ['Node.cornerRadius', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
