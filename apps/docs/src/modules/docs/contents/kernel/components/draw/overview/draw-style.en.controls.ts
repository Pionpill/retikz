import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw open-path appearance controls in English */
export const drawStyleEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw path appearance',
  sections: [
    {
      label: 'Stroke',
      controls: [
        { kind: 'color', id: 'stroke', label: 'Color', defaultValue: '#1e90ff' },
        { kind: 'range', id: 'strokeWidth', label: 'Width', defaultValue: 2, min: 1, max: 8, step: 0.5 },
        { kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: false },
        {
          kind: 'range',
          id: 'dashOffset',
          label: 'dashOffset',
          defaultValue: 0,
          min: -12,
          max: 12,
          step: 1,
          visibleWhen: { controlId: 'dashed', oneOf: [true] },
        },
      ],
    },
    {
      label: 'Geometry and endpoints',
      controls: [
        {
          kind: 'select',
          id: 'arrow',
          label: 'arrow',
          defaultValue: '->',
          options: [
            { value: 'none', label: 'None' },
            { value: '->', label: 'End' },
            { value: '<-', label: 'Start' },
            { value: '<->', label: 'Both ends' },
          ],
        },
        {
          kind: 'range',
          id: 'roundedCorners',
          label: 'Corner radius',
          defaultValue: 0,
          min: 0,
          max: 40,
          step: 2,
        },
      ],
    },
  ],
});
