import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** 图元关系 playground 使用的稳定字段 id */
export const PrimitiveRelationsPlaygroundControlId = {
  Anchor: 'anchor',
  AnchorAngle: 'anchorAngle',
  BoundaryOverride: 'boundaryOverride',
  SourceAngle: 'sourceAngle',
} as const;

/** 数字 anchor 只在选择自定义角度时显示 */
export const PrimitiveRelationsPlaygroundVisibleWhen = {
  AnchorAngle: { controlId: PrimitiveRelationsPlaygroundControlId.Anchor, oneOf: ['angle'] },
} as const;

/** 图元关系端点解析的中文操作面板 */
export const primitiveRelationsPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '端点关系',
  sections: [
    {
      label: '目标端点',
      controls: [
        {
          kind: 'select',
          id: PrimitiveRelationsPlaygroundControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动贴边' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'angle', label: '数字角度' },
          ],
        },
        {
          kind: 'range',
          id: PrimitiveRelationsPlaygroundControlId.AnchorAngle,
          label: 'anchor 角度',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: PrimitiveRelationsPlaygroundVisibleWhen.AnchorAngle,
        },
        {
          kind: 'select',
          id: PrimitiveRelationsPlaygroundControlId.BoundaryOverride,
          label: 'boundary',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: '继承矩形' },
            { value: 'shape', label: '视觉形状' },
            { value: 'circle', label: '本端点改用圆' },
          ],
        },
      ],
    },
    {
      label: '来源图元',
      controls: [
        {
          kind: 'range',
          id: PrimitiveRelationsPlaygroundControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
  ],
});

/** 图元关系 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: primitiveRelationsPlaygroundControls,
  canonicalValues: { anchor: 'auto', anchorAngle: 45, boundaryOverride: 'inherit', sourceAngle: -35 },
  presets: [
    { id: 'auto-follow', label: '自动跟随', values: { anchor: 'auto', boundaryOverride: 'inherit' } },
    { id: 'locked-right', label: '锁定右侧', values: { anchor: 'right', boundaryOverride: 'inherit' } },
    { id: 'circle-override', label: '单边圆形覆盖', values: { anchor: 'auto', boundaryOverride: 'circle' } },
  ],
  relatedApis: ['Draw.way', 'IRNodeTarget.anchor', 'IRNodeTarget.boundary'],
} satisfies PreviewControlContract;
