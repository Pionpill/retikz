import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { NodeShapeConnectionControlId } from './node-shape-connection.controls';

const shapeOptions = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'circle', label: 'Circle' },
  { value: 'ellipse', label: 'Ellipse' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'polygon', label: 'Hexagon' },
  { value: 'star', label: 'Star' },
  { value: 'sector', label: 'Sector' },
] as const;

const boundaryOptions = [
  { value: 'shape', label: 'Visual shape' },
  { value: 'circle', label: 'Circle surface' },
  { value: 'rectangle', label: 'Rectangle surface' },
  { value: 'ellipse', label: 'Ellipse surface' },
] as const;

const fitOptions = [
  { value: 'tight', label: 'Fit shape' },
  { value: 'bounds', label: 'Enclose bounds' },
] as const;

const anchorOptions = [
  { value: 'auto', label: 'Auto clip' },
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

/** Node shape, connection surface, and named-anchor controls in English */
export const nodeShapeConnectionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Shape',
  sections: [
    {
      label: 'Node A',
      controls: [
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.ShapeA,
          label: 'shape',
          defaultValue: 'star',
          options: shapeOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.BoundaryA,
          label: 'boundary',
          defaultValue: 'circle',
          options: boundaryOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.FitA,
          label: 'fit',
          defaultValue: 'tight',
          options: fitOptions,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryA, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'range',
          id: NodeShapeConnectionControlId.GapA,
          label: 'gap',
          defaultValue: 0,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryA, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.AnchorA,
          label: 'anchor',
          defaultValue: 'auto',
          options: anchorOptions,
        },
      ],
    },
    {
      label: 'Node B',
      controls: [
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.ShapeB,
          label: 'shape',
          defaultValue: 'ellipse',
          options: shapeOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.BoundaryB,
          label: 'boundary',
          defaultValue: 'ellipse',
          options: boundaryOptions,
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.FitB,
          label: 'fit',
          defaultValue: 'tight',
          options: fitOptions,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryB, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'range',
          id: NodeShapeConnectionControlId.GapB,
          label: 'gap',
          defaultValue: 0,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: { controlId: NodeShapeConnectionControlId.BoundaryB, oneOf: ['circle', 'rectangle', 'ellipse'] },
        },
        {
          kind: 'select',
          id: NodeShapeConnectionControlId.AnchorB,
          label: 'anchor',
          defaultValue: 'auto',
          options: anchorOptions,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node shape and connection controls */
export const previewControlContract = {
  controls: nodeShapeConnectionControls,
  canonicalValues: {
    shapeA: 'star',
    boundaryA: 'circle',
    fitA: 'tight',
    gapA: 0,
    anchorA: 'auto',
    shapeB: 'ellipse',
    boundaryB: 'ellipse',
    fitB: 'tight',
    gapB: 0,
    anchorB: 'auto',
  },
  relatedApis: ['Node.shape', 'Node.boundary', 'Draw.way'],
} satisfies PreviewControlContract;
