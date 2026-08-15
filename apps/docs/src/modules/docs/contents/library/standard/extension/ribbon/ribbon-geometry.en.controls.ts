import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English controls for the Ribbon geometry playground */
export const ribbonGeometryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon geometry',
  sections: [
    {
      label: 'Width model',
      controls: [
        {
          kind: 'select',
          id: 'widthMode',
          label: 'Model',
          defaultValue: 'endpoints',
          options: [
            { value: 'endpoints', label: 'Endpoint widths' },
            { value: 'stops', label: 'Width stops' },
            { value: 'profile', label: 'Bulge profile' },
          ],
        },
        { kind: 'range', id: 'startWidth', label: 'Start width', defaultValue: 16, min: 4, max: 64, step: 2 },
        { kind: 'range', id: 'endWidth', label: 'End width', defaultValue: 44, min: 4, max: 64, step: 2 },
        {
          kind: 'range',
          id: 'middleWidth',
          label: 'Middle width',
          defaultValue: 10,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['stops'] },
        },
        {
          kind: 'range',
          id: 'peakWidth',
          label: 'Peak width',
          defaultValue: 58,
          min: 8,
          max: 72,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['profile'] },
        },
        {
          kind: 'select',
          id: 'endpointInterpolation',
          label: 'Interpolation',
          defaultValue: 'smooth',
          options: [
            { value: 'linear', label: 'linear' },
            { value: 'smooth', label: 'smooth' },
          ],
          visibleWhen: { controlId: 'widthMode', oneOf: ['endpoints'] },
        },
        {
          kind: 'select',
          id: 'stopInterpolation',
          label: 'Interpolation',
          defaultValue: 'smooth',
          options: [
            { value: 'linear', label: 'linear' },
            { value: 'smooth', label: 'smooth' },
            { value: 'step', label: 'step' },
          ],
          visibleWhen: { controlId: 'widthMode', oneOf: ['stops'] },
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        { kind: 'color', id: 'fill', label: 'Fill', defaultValue: '#38bdf8' },
        { kind: 'range', id: 'fillOpacity', label: 'Fill opacity', defaultValue: 0.75, min: 0.1, max: 1, step: 0.05 },
        { kind: 'color', id: 'stroke', label: 'Stroke', defaultValue: '#075985' },
        { kind: 'range', id: 'strokeWidth', label: 'Stroke width', defaultValue: 1, min: 0, max: 6, step: 0.5 },
        { kind: 'switch', id: 'shadow', label: 'Shadow', defaultValue: false },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: ribbonGeometryControls,
  canonicalValues: {
    widthMode: 'endpoints',
    startWidth: 16,
    endWidth: 44,
    middleWidth: 10,
    peakWidth: 58,
    endpointInterpolation: 'smooth',
    stopInterpolation: 'smooth',
    fill: '#38bdf8',
    fillOpacity: 0.75,
    stroke: '#075985',
    strokeWidth: 1,
    shadow: false,
  },
  relatedApis: [
    'Path.kind',
    'Path.kindOptions',
    'Path.fill',
    'Path.fillOpacity',
    'Path.stroke',
    'Path.strokeWidth',
    'Path.shadow',
  ],
} satisfies PreviewControlContract;
