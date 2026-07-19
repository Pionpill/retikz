import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Polygon 节点连接 playground 使用的稳定字段 id */
export const PolygonNodeConnectionControlId = {
  Shape: 'shape',
  SourceAngle: 'sourceAngle',
  SourceDistance: 'sourceDistance',
  CornerRadius: 'cornerRadius',
  Anchor: 'anchor',
  AnchorAngle: 'anchorAngle',
} as const;

/** 依赖 shape / anchor 的条件字段 */
export const PolygonNodeConnectionVisibleWhen = {
  CornerRadius: { controlId: PolygonNodeConnectionControlId.Shape, oneOf: ['hexagon'] },
  AnchorAngle: { controlId: PolygonNodeConnectionControlId.Anchor, oneOf: ['angle'] },
} as const;

/** Polygon 节点连接的中文属性面板 */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '连接位置',
  sections: [
    {
      label: '目标节点',
      controls: [
        {
          kind: 'select',
          id: PolygonNodeConnectionControlId.Shape,
          label: 'shape',
          defaultValue: 'hexagon',
          options: [
            { value: 'hexagon', label: '六边形' },
            { value: 'diamond', label: '菱形' },
          ],
        },
        {
          kind: 'range',
          id: PolygonNodeConnectionControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 12,
          min: 0,
          max: 28,
          step: 1,
          visibleWhen: PolygonNodeConnectionVisibleWhen.CornerRadius,
        },
        {
          kind: 'select',
          id: PolygonNodeConnectionControlId.Anchor,
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
          id: PolygonNodeConnectionControlId.AnchorAngle,
          label: 'anchor 角度',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: PolygonNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: '来源节点',
      controls: [
        {
          kind: 'range',
          id: PolygonNodeConnectionControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: PolygonNodeConnectionControlId.SourceDistance,
          label: '轨道距离',
          defaultValue: 108,
          min: 80,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Polygon 节点连接 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: {
    shape: 'hexagon',
    sourceAngle: -35,
    sourceDistance: 108,
    cornerRadius: 12,
    anchor: 'auto',
    anchorAngle: 45,
  },
  presets: [
    { id: 'diamond-auto', label: '菱形自动贴边', values: { shape: 'diamond', anchor: 'auto' } },
    {
      id: 'rounded-angle',
      label: '圆角数字锚点',
      values: { shape: 'hexagon', cornerRadius: 18, anchor: 'angle', anchorAngle: 135 },
    },
  ],
  relatedApis: ['Node.shape', 'Node.shape.params.cornerRadius', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
