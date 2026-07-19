import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English controls for the Path structure playground */
export const pathStructureControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path structure',
  sections: [
    {
      label: 'Structure',
      controls: [
        {
          kind: 'select',
          id: 'structure',
          label: 'Structure',
          defaultValue: 'polyline',
          options: [
            { value: 'polyline', label: 'Polyline' },
            { value: 'subpaths', label: 'Multiple subpaths' },
            { value: 'fill', label: 'Filled path' },
          ],
        },
        {
          kind: 'color',
          id: 'fill',
          label: 'Fill',
          defaultValue: '#1e90ff',
          visibleWhen: { controlId: 'structure', oneOf: ['fill'] },
        },
      ],
    },
  ],
});
