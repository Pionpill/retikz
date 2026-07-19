import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Ribbon 宽度与样式 playground 的中文属性面板 */
export const ribbonGeometryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon 几何',
  sections: [
    {
      label: '宽度模型',
      controls: [
        {
          kind: 'select',
          id: 'widthMode',
          label: '模型',
          defaultValue: 'endpoints',
          options: [
            { value: 'endpoints', label: '起止宽度' },
            { value: 'stops', label: '宽度 stops' },
            { value: 'profile', label: 'bulge profile' },
          ],
        },
        { kind: 'range', id: 'startWidth', label: '起点宽度', defaultValue: 16, min: 4, max: 64, step: 2 },
        { kind: 'range', id: 'endWidth', label: '终点宽度', defaultValue: 44, min: 4, max: 64, step: 2 },
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
          visibleWhen: { controlId: 'widthMode', oneOf: ['endpoints'] },
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
    {
      label: '外观',
      controls: [
        { kind: 'color', id: 'fill', label: '填充色', defaultValue: '#38bdf8' },
        { kind: 'range', id: 'fillOpacity', label: '填充透明度', defaultValue: 0.75, min: 0.1, max: 1, step: 0.05 },
        { kind: 'color', id: 'stroke', label: '描边色', defaultValue: '#075985' },
        { kind: 'range', id: 'strokeWidth', label: '描边宽度', defaultValue: 1, min: 0, max: 6, step: 0.5 },
        { kind: 'switch', id: 'shadow', label: '阴影', defaultValue: false },
      ],
    },
  ],
});
