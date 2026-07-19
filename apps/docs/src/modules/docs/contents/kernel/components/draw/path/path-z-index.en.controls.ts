import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for Path stacking */
export const pathZIndexControls = definePreviewControls({
  presentation: 'panel',
  title: 'Stacking',
  sections: [
    {
      label: 'Overlap',
      controls: [{ kind: 'range', id: 'zIndex', label: 'Blue zIndex', defaultValue: 1, min: -1, max: 2, step: 1 }],
    },
  ],
});
