import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for the Way closure state */
export const wayCycleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Closure',
  sections: [
    {
      label: 'Path',
      controls: [
        {
          kind: 'select',
          id: 'state',
          label: 'Path state',
          defaultValue: 'open',
          options: [
            { value: 'open', label: 'Open path' },
            { value: 'closed', label: 'Closed path' },
          ],
        },
      ],
    },
  ],
});
