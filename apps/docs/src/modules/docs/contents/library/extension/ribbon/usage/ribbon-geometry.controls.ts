import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

/** Ribbon 宽度 playground 的中文属性面板 */
export const ribbonGeometryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon 宽度',
  sections: [
    {
      controls: [
        {
          kind: 'select',
          id: 'widthMode',
          label: '模型',
          defaultValue: 'taper',
          options: [
            { value: 'fixed', label: '固定宽度 (fixed)' },
            { value: 'taper', label: '起止宽度 (taper)' },
            { value: 'stops', label: '宽度 stops' },
            { value: 'profile', label: 'bulge profile' },
          ],
        },
        {
          kind: 'range',
          id: 'fixedWidth',
          label: '宽度',
          defaultValue: 24,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['fixed'] },
        },
        {
          kind: 'range',
          id: 'startWidth',
          label: '起点宽度',
          defaultValue: 16,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['taper', 'stops', 'profile'] },
        },
        {
          kind: 'range',
          id: 'endWidth',
          label: '终点宽度',
          defaultValue: 44,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['taper', 'stops'] },
        },
        {
          kind: 'range',
          id: 'middleWidth',
          label: '中段宽度',
          defaultValue: 10,
          min: 4,
          max: 64,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['stops'] },
        },
        {
          kind: 'range',
          id: 'peakWidth',
          label: '峰值宽度',
          defaultValue: 58,
          min: 8,
          max: 72,
          step: 2,
          visibleWhen: { controlId: 'widthMode', oneOf: ['profile'] },
        },
        {
          kind: 'select',
          id: 'endpointInterpolation',
          label: '插值',
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
          label: '插值',
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

/** 当前 controls 面板的稳定文档契约 */
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
