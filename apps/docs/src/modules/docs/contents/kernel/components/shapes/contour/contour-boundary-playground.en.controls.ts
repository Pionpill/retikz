import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ContourBoundaryControlId, ContourBoundaryVisibleWhen } from './contour-boundary-playground.controls';

/** Contour 连接边界的英文属性面板 */
export const contourBoundaryPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Contour Connection Boundary',
  sections: [
    {
      label: 'Target node',
      controls: [
        {
          kind: 'select',
          id: ContourBoundaryControlId.PointSet,
          label: 'Point coordinates',
          defaultValue: 'centered',
          options: [
            { value: 'centered', label: 'Near the origin' },
            { value: 'shifted', label: 'Shifted by +200' },
          ],
        },
        {
          kind: 'range',
          id: ContourBoundaryControlId.CornerRadius,
          label: 'Contour rounding',
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
            { value: 'auto', label: 'Auto clip' },
            { value: 'center', label: 'center' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'angle', label: 'Numeric angle' },
          ],
        },
        {
          kind: 'range',
          id: ContourBoundaryControlId.AnchorAngle,
          label: 'anchor angle',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: ContourBoundaryVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: 'Source node',
      controls: [
        {
          kind: 'range',
          id: ContourBoundaryControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: 180,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: ContourBoundaryControlId.SourceDistance,
          label: 'Orbit distance',
          defaultValue: 150,
          min: 100,
          max: 200,
          step: 5,
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'color',
          id: ContourBoundaryControlId.Fill,
          label: 'Fill',
          defaultValue: '#bfdbfe',
        },
        {
          kind: 'color',
          id: ContourBoundaryControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#1d4ed8',
        },
      ],
    },
  ],
});

/** Contour 边界 playground 的英文稳定状态与 API 覆盖 */
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
    { id: 'shifted-input', label: 'Shifted points stay centered', values: { pointSet: 'shifted' } },
    { id: 'sharp-right', label: 'Sharp from right', values: { cornerRadius: 0, sourceAngle: 0 } },
    { id: 'rounded-top', label: 'Rounded from top', values: { cornerRadius: 14, sourceAngle: -90 } },
    { id: 'aabb-top', label: 'AABB top anchor', values: { anchor: 'top' } },
    { id: 'angle-anchor', label: 'Numeric angle anchor', values: { anchor: 'angle', anchorAngle: 35 } },
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
