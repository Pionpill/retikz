import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for the Path endpoint connection surface */
export const pathBoundaryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Endpoint surface',
  sections: [
    {
      label: 'Endpoint',
      controls: [
        {
          kind: 'select',
          id: 'boundary',
          label: 'Surface',
          defaultValue: 'shape',
          options: [
            { value: 'shape', label: 'Star outline' },
            { value: 'circle', label: 'Circumscribed circle' },
          ],
        },
      ],
    },
  ],
});
