import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for the Way fold direction */
export const wayFoldControls = definePreviewControls({
  presentation: 'panel',
  title: 'Fold',
  sections: [
    {
      label: 'Path',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Fold direction',
          defaultValue: '-|',
          options: [
            { value: '-|', label: 'Horizontal → vertical' },
            { value: '|-', label: 'Vertical → horizontal' },
          ],
        },
      ],
    },
  ],
});
