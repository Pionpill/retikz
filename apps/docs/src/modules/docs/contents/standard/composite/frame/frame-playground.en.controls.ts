import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Frame layout, border, and header Node style controls in English */
export const framePlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Frame properties',
  sections: [
    {
      label: 'Layout',
      controls: [
        { kind: 'range', id: 'paddingX', label: 'Horizontal padding', defaultValue: 8, min: 0, max: 32, step: 2 },
        { kind: 'range', id: 'paddingY', label: 'Vertical padding', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'gap', label: 'Header gap', defaultValue: 4, min: 0, max: 24, step: 2 },
        {
          kind: 'select',
          id: 'headerDirection',
          label: 'Header direction',
          defaultValue: 'horizontal',
          options: [
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ],
        },
      ],
    },
    {
      label: 'Border',
      controls: [
        {
          kind: 'select',
          id: 'borderStroke',
          label: 'Stroke',
          defaultValue: 'currentColor',
          options: [
            { value: 'currentColor', label: 'Current text color' },
            { value: 'dimgray', label: 'Dim gray' },
            { value: 'dodgerblue', label: 'Blue' },
            { value: 'darkorange', label: 'Orange' },
          ],
        },
        { kind: 'range', id: 'strokeWidth', label: 'Stroke width', defaultValue: 1, min: 0.5, max: 4, step: 0.5 },
        { kind: 'range', id: 'strokeOpacity', label: 'Stroke opacity', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        { kind: 'range', id: 'borderCornerRadius', label: 'Corner radius', defaultValue: 0, min: 0, max: 16, step: 2 },
        {
          kind: 'select',
          id: 'borderLineStyle',
          label: 'Border line style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
        },
        { kind: 'range', id: 'fillOpacity', label: 'Fill opacity', defaultValue: 0, min: 0, max: 0.3, step: 0.05 },
      ],
    },
    {
      label: 'Title and description',
      controls: [
        { kind: 'range', id: 'titlePadding', label: 'Title padding', defaultValue: 0, min: 0, max: 12, step: 2 },
        {
          kind: 'select',
          id: 'titleFontSize',
          label: 'Title font size',
          defaultValue: 'sm',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
            { value: 'lg', label: 'lg' },
          ],
        },
        {
          kind: 'range',
          id: 'titleFontWeight',
          label: 'Title weight',
          defaultValue: 600,
          min: 400,
          max: 700,
          step: 100,
        },
        {
          kind: 'range',
          id: 'titleFillOpacity',
          label: 'Title fill opacity',
          defaultValue: 0,
          min: 0,
          max: 0.24,
          step: 0.04,
        },
        {
          kind: 'select',
          id: 'descriptionFontSize',
          label: 'Description size',
          defaultValue: 'xs',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
          ],
        },
        {
          kind: 'range',
          id: 'descriptionOpacity',
          label: 'Description opacity',
          defaultValue: 0.7,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: 'Node A',
      controls: [{ kind: 'text', id: 'nodeAText', label: 'Text', defaultValue: 'A' }],
    },
    {
      label: 'Node B',
      controls: [{ kind: 'text', id: 'nodeBText', label: 'Text', defaultValue: 'B' }],
    },
    {
      label: 'Node relation',
      controls: [{ kind: 'switch', id: 'connected', label: 'Connect A and B', defaultValue: true }],
    },
  ],
});

/** Stable English documentation contract for the Frame playground */
export const previewControlContract = {
  controls: framePlaygroundEnControls,
  canonicalValues: {
    paddingX: 8,
    paddingY: 8,
    gap: 4,
    headerDirection: 'horizontal',
    borderStroke: 'currentColor',
    strokeWidth: 1,
    strokeOpacity: 1,
    borderCornerRadius: 0,
    borderLineStyle: 'solid',
    fillOpacity: 0,
    titlePadding: 0,
    titleFontSize: 'sm',
    titleFontWeight: 600,
    titleFillOpacity: 0,
    descriptionFontSize: 'xs',
    descriptionOpacity: 0.7,
    nodeAText: 'A',
    nodeBText: 'B',
    connected: true,
  },
  relatedApis: [
    'Frame.padding',
    'Frame.gap',
    'Frame.headerDirection',
    'Frame.border',
    'Frame.border.style',
    'Frame.border.cornerRadius',
    'FrameTitle.padding',
    'FrameTitle.font',
    'FrameTitle.fill',
    'FrameTitle.fillOpacity',
    'FrameDescription.font',
    'FrameDescription.opacity',
    'Node.text',
    'Draw.way',
  ],
} satisfies PreviewControlContract;
