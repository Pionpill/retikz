import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Step target controls in English */
export const stepTargetingEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step target positioning',
  sections: [
    {
      label: 'Target form',
      controls: [
        {
          kind: 'select',
          id: 'targetKind',
          label: 'to',
          defaultValue: 'offset',
          options: [
            { value: 'offset', label: 'Referent offset' },
            { value: 'relative', label: 'Relative' },
            { value: 'relativeAccumulate', label: 'Relative accumulate' },
          ],
        },
        { kind: 'range', id: 'offsetX', label: 'x', defaultValue: 80, min: -40, max: 120, step: 5 },
        { kind: 'range', id: 'offsetY', label: 'y', defaultValue: -35, min: -70, max: 30, step: 5 },
      ],
    },
  ],
});
