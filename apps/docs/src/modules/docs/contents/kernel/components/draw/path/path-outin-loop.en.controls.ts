import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for Path outgoing and incoming angles */
export const pathOutInLoopControls = definePreviewControls({
  presentation: 'panel',
  title: 'Outgoing and incoming angles',
  sections: [
    {
      label: 'Path',
      controls: [
        {
          kind: 'select',
          id: 'mode',
          label: 'Mode',
          defaultValue: 'loop',
          options: [
            { value: 'loop', label: 'Self loop' },
            { value: 'connect', label: 'Connect S → T' },
          ],
        },
        { kind: 'range', id: 'outAngle', label: 'Outgoing angle', defaultValue: 120, min: -180, max: 180, step: 5 },
        { kind: 'range', id: 'inAngle', label: 'Incoming angle', defaultValue: 60, min: -180, max: 180, step: 5 },
        {
          kind: 'range',
          id: 'loopLooseness',
          label: 'Loop looseness',
          defaultValue: 72,
          min: 48,
          max: 80,
          step: 8,
          visibleWhen: { controlId: 'mode', oneOf: ['loop'] },
        },
        {
          kind: 'range',
          id: 'looseness',
          label: 'Connection looseness',
          defaultValue: 1,
          min: 0.5,
          max: 2,
          step: 0.1,
          visibleWhen: { controlId: 'mode', oneOf: ['connect'] },
        },
      ],
    },
  ],
});
