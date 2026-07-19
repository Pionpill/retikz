import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for the Path gradient stroke */
export const pathStrokePaintControls = definePreviewControls({
  presentation: 'panel',
  title: 'Gradient stroke',
  sections: [
    {
      label: 'Gradient',
      controls: [
        { kind: 'range', id: 'angle', label: 'Angle', defaultValue: 90, min: 0, max: 360, step: 15 },
        { kind: 'color', id: 'startColor', label: 'Start color', defaultValue: '#2563eb' },
        { kind: 'color', id: 'middleColor', label: 'Middle color', defaultValue: '#f59e0b' },
        { kind: 'color', id: 'endColor', label: 'End color', defaultValue: '#e11d48' },
      ],
    },
  ],
});
