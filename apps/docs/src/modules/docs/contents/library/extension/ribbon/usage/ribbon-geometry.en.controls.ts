import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

/** English controls for the Ribbon widths playground */
export const ribbonGeometryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon widths',
  sections: [
    {
      controls: [
        {
          kind: 'select',
          id: 'widthMode',
          label: 'Model',
          defaultValue: 'taper',
          options: [
            { value: 'fixed', label: 'Fixed width (fixed)' },
            { value: 'taper', label: 'Endpoint widths (taper)' },
            { value: 'stops', label: 'Width stops' },
            { value: 'profile', label: 'Bulge profile' },
          ],
        },
        {
          kind: 'range',
          id: 'fixedWidth',
          label: 'Width',
          defaultValue: 24,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['fixed'] },
        },
        {
          kind: 'range',
          id: 'startWidth',
          label: 'Start width',
          defaultValue: 16,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['taper', 'stops', 'profile'] },
        },
        {
          kind: 'range',
          id: 'endWidth',
          label: 'End width',
          defaultValue: 44,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['taper', 'stops'] },
        },
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
          visibleWhen: { controlId: 'widthMode', oneOf: ['taper'] },
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
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: ribbonGeometryControls,
  canonicalValues: {
    widthMode: 'taper',
    fixedWidth: 24,
    startWidth: 16,
    endWidth: 44,
    middleWidth: 10,
    peakWidth: 58,
    endpointInterpolation: 'smooth',
    stopInterpolation: 'smooth',
  },
  relatedApis: ['Path.kind', 'Path.kindOptions'],
} satisfies PreviewControlContract;
