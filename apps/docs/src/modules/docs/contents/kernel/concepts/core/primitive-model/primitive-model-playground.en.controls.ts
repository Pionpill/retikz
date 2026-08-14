import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import {
  PrimitiveModelPlaygroundControlId,
  PrimitiveModelPlaygroundVisibleWhen,
} from './primitive-model-playground.controls';

const canonicalValues = {
  shape: 'star',
  content: 'Primitive\nNode',
  boundary: 'circle',
  fit: 'tight',
  gap: 0,
  fill: '#fbbf24',
  stroke: '#b45309',
  strokeWidth: 2,
  sourceAngle: -30,
} as const;

/** Primitive Model controls in English */
export const primitiveModelPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Primitive workbench',
  sections: [
    {
      label: 'Primitive',
      controls: [
        {
          kind: 'select',
          id: PrimitiveModelPlaygroundControlId.Shape,
          label: 'shape',
          defaultValue: canonicalValues.shape,
          options: [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'diamond', label: 'Diamond' },
            { value: 'polygon', label: 'Hexagon' },
            { value: 'star', label: 'Star' },
            { value: 'sector', label: 'Annular sector' },
          ],
        },
        {
          kind: 'text',
          id: PrimitiveModelPlaygroundControlId.Content,
          label: 'Content',
          defaultValue: canonicalValues.content,
          placeholder: 'Enter text; press Enter for a new line',
          multiline: true,
        },
      ],
    },
    {
      label: 'Connection surface',
      controls: [
        {
          kind: 'select',
          id: PrimitiveModelPlaygroundControlId.Boundary,
          label: 'boundary',
          defaultValue: canonicalValues.boundary,
          options: [
            { value: 'shape', label: 'Visual shape' },
            { value: 'circle', label: 'Regular circle' },
            { value: 'rectangle', label: 'Regular rectangle' },
            { value: 'ellipse', label: 'Regular ellipse' },
          ],
        },
        {
          kind: 'select',
          id: PrimitiveModelPlaygroundControlId.Fit,
          label: 'fit',
          defaultValue: canonicalValues.fit,
          options: [
            { value: 'tight', label: 'Tight envelope' },
            { value: 'bounds', label: 'Enclose bounds' },
          ],
          visibleWhen: PrimitiveModelPlaygroundVisibleWhen.FittableBoundary,
        },
        {
          kind: 'range',
          id: PrimitiveModelPlaygroundControlId.Gap,
          label: 'gap',
          defaultValue: canonicalValues.gap,
          min: -12,
          max: 28,
          step: 2,
          visibleWhen: PrimitiveModelPlaygroundVisibleWhen.RegularBoundary,
        },
      ],
    },
    {
      label: 'Basic appearance',
      controls: [
        {
          kind: 'color',
          id: PrimitiveModelPlaygroundControlId.Fill,
          label: 'fill',
          defaultValue: canonicalValues.fill,
        },
        {
          kind: 'color',
          id: PrimitiveModelPlaygroundControlId.Stroke,
          label: 'stroke',
          defaultValue: canonicalValues.stroke,
        },
        {
          kind: 'number',
          id: PrimitiveModelPlaygroundControlId.StrokeWidth,
          label: 'strokeWidth',
          defaultValue: canonicalValues.strokeWidth,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
    {
      label: 'Viewing direction',
      controls: [
        {
          kind: 'range',
          id: PrimitiveModelPlaygroundControlId.SourceAngle,
          label: 'Source angle',
          defaultValue: canonicalValues.sourceAngle,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Primitive Model playground */
export const previewControlContract = {
  controls: primitiveModelPlaygroundEnControls,
  canonicalValues,
  presets: [
    {
      id: 'text-container',
      label: 'Text container',
      values: { ...canonicalValues, shape: 'rectangle', content: 'Text\ncontainer', boundary: 'shape' },
    },
    { id: 'tight-star', label: 'Tight circle on star', values: canonicalValues },
    {
      id: 'bounds-sector',
      label: 'Bounds circle on sector',
      values: { ...canonicalValues, shape: 'sector', content: 'Sector', fit: 'bounds' },
    },
  ],
  relatedApis: [
    'Node.children',
    'Node.shape',
    'Node.boundary',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
    'Draw.way',
    'IRBoundary.params.fit',
    'IRBoundary.params.gap',
  ],
} satisfies PreviewControlContract;
