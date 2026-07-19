import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Contour 边界 playground 使用的稳定字段 id */
export const ContourBoundaryControlId = {
  PointSet: 'pointSet',
  CornerRadius: 'cornerRadius',
  SourceAngle: 'sourceAngle',
  SourceDistance: 'sourceDistance',
  Anchor: 'anchor',
  AnchorAngle: 'anchorAngle',
  Fill: 'fill',
  Stroke: 'stroke',
} as const;

/** 数字 anchor 仅在选择角度锚点时显示 */
export const ContourBoundaryVisibleWhen = {
  AnchorAngle: { controlId: ContourBoundaryControlId.Anchor, oneOf: ['angle'] },
} as const;

/** Contour 连接边界的中文属性面板 */
export const contourBoundaryPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Contour 连接边界',
  sections: [
    {
      label: '目标节点',
      controls: [
        {
          kind: 'select',
          id: ContourBoundaryControlId.PointSet,
          label: '点集坐标',
          defaultValue: 'centered',
          options: [
            { value: 'centered', label: '原点附近' },
            { value: 'shifted', label: '整体偏移 +200' },
          ],
        },
        {
          kind: 'range',
          id: ContourBoundaryControlId.CornerRadius,
          label: '轮廓圆角',
          defaultValue: 6,
          min: 0,
          max: 18,
          step: 1,
        },
        {
          kind: 'select',
          id: ContourBoundaryControlId.Anchor,
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
          id: ContourBoundaryControlId.AnchorAngle,
          label: 'anchor 角度',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: ContourBoundaryVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: '来源节点',
      controls: [
        {
          kind: 'range',
          id: ContourBoundaryControlId.SourceAngle,
          label: '轨道角度',
          defaultValue: 180,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: ContourBoundaryControlId.SourceDistance,
          label: '轨道距离',
          defaultValue: 150,
          min: 100,
          max: 200,
          step: 5,
        },
      ],
    },
    {
      label: '外观',
      controls: [
        {
          kind: 'color',
          id: ContourBoundaryControlId.Fill,
          label: '填充色',
          defaultValue: '#bfdbfe',
        },
        {
          kind: 'color',
          id: ContourBoundaryControlId.Stroke,
          label: '描边色',
          defaultValue: '#1d4ed8',
        },
      ],
    },
  ],
});

/** Contour 边界 playground 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: contourBoundaryPlaygroundControls,
  canonicalValues: {
    pointSet: 'centered',
    cornerRadius: 6,
    sourceAngle: 180,
    sourceDistance: 150,
    anchor: 'auto',
    anchorAngle: 45,
    fill: '#bfdbfe',
    stroke: '#1d4ed8',
  },
  presets: [
    { id: 'shifted-input', label: '偏移点集仍居中', values: { pointSet: 'shifted' } },
    { id: 'sharp-right', label: '右侧尖角', values: { cornerRadius: 0, sourceAngle: 0 } },
    { id: 'rounded-top', label: '上方圆角', values: { cornerRadius: 14, sourceAngle: -90 } },
    { id: 'aabb-top', label: 'AABB 顶部锚点', values: { anchor: 'top' } },
    { id: 'angle-anchor', label: '数字角度锚点', values: { anchor: 'angle', anchorAngle: 35 } },
  ],
  relatedApis: [
    'Node.shape.params.points',
    'Node.shape.params.cornerRadius',
    'Node.position',
    'ShapeDefinition.boundaryPoint',
    'Draw.way',
    'IRNodeTarget.anchor',
    'Node.fill',
    'Node.stroke',
  ],
} satisfies PreviewControlContract;
