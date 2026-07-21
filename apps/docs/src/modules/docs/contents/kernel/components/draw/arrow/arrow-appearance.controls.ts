import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

const shapeOptions = [
  { label: '实心三角', value: 'normal' },
  { label: '空心三角', value: 'open' },
  { label: '实心锐箭', value: 'stealth' },
  { label: '空心锐箭', value: 'openStealth' },
  { label: '实心菱形', value: 'diamond' },
  { label: '空心菱形', value: 'openDiamond' },
  { label: '实心圆点', value: 'circle' },
  { label: '空心圆点', value: 'openCircle' },
] as const;

/** Arrow 方向、形状、起末覆盖与外观的中文属性面板 */
export const arrowAppearanceControls = definePreviewControls({
  presentation: 'panel',
  title: 'Arrow',
  sections: [
    {
      label: '端点',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: '方向',
          defaultValue: '<->',
          options: [
            { label: '无箭头', value: 'none' },
            { label: '末端', value: '->' },
            { label: '起端', value: '<-' },
            { label: '两端', value: '<->' },
          ],
        },
        { kind: 'select', id: 'shape', label: '共用形状', defaultValue: 'stealth', options: shapeOptions },
        { kind: 'switch', id: 'separateEnds', label: '分别配置起末', defaultValue: false },
        {
          kind: 'select',
          id: 'startShape',
          label: '起端形状',
          defaultValue: 'diamond',
          options: shapeOptions,
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
        {
          kind: 'select',
          id: 'endShape',
          label: '末端形状',
          defaultValue: 'open',
          options: shapeOptions,
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
      ],
    },
    {
      label: '颜色与透明度',
      controls: [
        { kind: 'color', id: 'color', label: '共用颜色', defaultValue: '#1e90ff' },
        {
          kind: 'color',
          id: 'startColor',
          label: '起端颜色',
          defaultValue: '#e63946',
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
        {
          kind: 'color',
          id: 'endColor',
          label: '末端颜色',
          defaultValue: '#1e90ff',
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
        { kind: 'range', id: 'opacity', label: '箭头透明度', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
      ],
    },
    {
      label: '尺寸',
      controls: [
        { kind: 'range', id: 'scale', label: 'scale', defaultValue: 1, min: 0.5, max: 2.5, step: 0.1 },
        { kind: 'range', id: 'length', label: 'length', defaultValue: 10, min: 2, max: 24, step: 1 },
        { kind: 'range', id: 'width', label: 'width', defaultValue: 8, min: 2, max: 20, step: 1 },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: arrowAppearanceControls,
  canonicalValues: {
    direction: '<->',
    shape: 'stealth',
    separateEnds: false,
    startShape: 'diamond',
    endShape: 'open',
    color: '#1e90ff',
    startColor: '#e63946',
    endColor: '#1e90ff',
    opacity: 1,
    scale: 1,
    length: 10,
    width: 8,
  },
  relatedApis: ['Draw.arrow', 'Draw.arrowDetail', 'Path.arrow', 'Path.arrowDetail'],
} satisfies PreviewControlContract;
