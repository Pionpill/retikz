import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for whole-Path transforms */
export const pathTransformControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path transform',
  sections: [
    {
      label: 'Transform',
      controls: [
        { kind: 'range', id: 'rotate', label: 'Rotate', defaultValue: 40, min: -180, max: 180, step: 5 },
        {
          kind: 'point',
          id: 'scale',
          label: 'Scale',
          defaultValue: [1, 1],
          min: [0.5, 0.5],
          max: [1.5, 1.5],
          step: 0.1,
        },
      ],
    },
  ],
});
