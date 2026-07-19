import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { NodeTextControlId } from './node-text.controls';

/** Node multiline content, wrapping, and per-line style controls in English */
export const nodeTextControls = definePreviewControls({
  presentation: 'panel',
  title: 'Text',
  sections: [
    {
      label: 'Content and layout',
      controls: [
        {
          kind: 'text',
          id: NodeTextControlId.Content,
          label: 'Content (newline per line)',
          defaultValue: 'A\nB\nC',
          multiline: true,
        },
        {
          kind: 'select',
          id: NodeTextControlId.Shape,
          label: 'shape',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'diamond', label: 'Diamond' },
          ],
        },
        {
          kind: 'select',
          id: NodeTextControlId.Align,
          label: 'align',
          defaultValue: 'middle',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'middle', label: 'Middle' },
            { value: 'end', label: 'End' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.MaxTextWidth,
          label: 'Wrap threshold',
          defaultValue: 150,
          min: 60,
          max: 220,
          step: 10,
        },
        {
          kind: 'range',
          id: NodeTextControlId.LineHeight,
          label: 'Line height',
          defaultValue: 24,
          min: 16,
          max: 36,
          step: 2,
        },
      ],
    },
    {
      label: 'Line 1 style',
      controls: [
        { kind: 'color', id: NodeTextControlId.FirstFill, label: 'Text color', defaultValue: '#2563eb' },
        {
          kind: 'select',
          id: NodeTextControlId.FirstEmphasis,
          label: 'Emphasis',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
            { value: 'italic', label: 'Italic' },
            { value: 'bold-italic', label: 'Bold italic' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.FirstOpacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: 'Line 2 style',
      controls: [
        { kind: 'color', id: NodeTextControlId.SecondFill, label: 'Text color', defaultValue: '#172033' },
        {
          kind: 'select',
          id: NodeTextControlId.SecondEmphasis,
          label: 'Emphasis',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
            { value: 'italic', label: 'Italic' },
            { value: 'bold-italic', label: 'Bold italic' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.SecondOpacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: 'Line 3 and later',
      controls: [
        { kind: 'color', id: NodeTextControlId.RestFill, label: 'Text color', defaultValue: '#f97316' },
        {
          kind: 'select',
          id: NodeTextControlId.RestEmphasis,
          label: 'Emphasis',
          defaultValue: 'italic',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
            { value: 'italic', label: 'Italic' },
            { value: 'bold-italic', label: 'Bold italic' },
          ],
        },
        {
          kind: 'range',
          id: NodeTextControlId.RestOpacity,
          label: 'Opacity',
          defaultValue: 0.75,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
  ],
});
