import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 圆与椭圆连接 playground 使用的稳定字段 id */
export const CircleEllipseNodeConnectionControlId = {
  Shape: 'shape',
  SourceAngle: 'sourceAngle',
  SourceDistance: 'sourceDistance',
  Anchor: 'anchor',
  AnchorAngle: 'anchorAngle',
} as const;

/** 数字 anchor 仅在选择角度锚点时显示 */
export const CircleEllipseNodeConnectionVisibleWhen = {
  AnchorAngle: { controlId: CircleEllipseNodeConnectionControlId.Anchor, oneOf: ['angle'] },
} as const;

/** 圆与椭圆节点连接的中文属性面板 */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '连接位置',
  sections: [
    {
      label: '目标节点',
      controls: [
        {
          kind: 'select',
          id: CircleEllipseNodeConnectionControlId.Shape,
          label: 'shape',
          defaultValue: 'ellipse',
          options: [
            { value: 'ellipse', label: '椭圆' },
            { value: 'circle', label: '圆' },
          ],
        },
        {
          kind: 'select',
          id: CircleEllipseNodeConnectionControlId.Anchor,
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
          id: CircleEllipseNodeConnectionControlId.AnchorAngle,
          label: 'anchor 角度',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: CircleEllipseNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: '来源节点',
      controls: [
        {
          kind: 'range',
          id: CircleEllipseNodeConnectionControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: CircleEllipseNodeConnectionControlId.SourceDistance,
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

/** 圆与椭圆节点连接 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { shape: 'ellipse', sourceAngle: -35, sourceDistance: 105, anchor: 'auto', anchorAngle: 45 },
  presets: [
    { id: 'circle-auto', label: '圆形自动贴边', values: { shape: 'circle', sourceAngle: 45, anchor: 'auto' } },
    { id: 'numeric-anchor', label: '数字锚点', values: { anchor: 'angle', anchorAngle: 135 } },
  ],
  relatedApis: ['Node.shape', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
