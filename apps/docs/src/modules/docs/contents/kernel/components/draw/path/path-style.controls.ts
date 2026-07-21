import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Path 描边与透明度 playground 的中文属性面板 */
export const pathStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path 外观',
  sections: [
    {
      label: '描边',
      controls: [
        { kind: 'color', id: 'stroke', label: '颜色', defaultValue: '#172033' },
        {
          kind: 'select',
          id: 'thickness',
          label: '粗细',
          defaultValue: 'custom',
          options: [
            { value: 'custom', label: '自定义' },
            { value: 'thin', label: 'thin' },
            { value: 'semithick', label: 'semithick' },
            { value: 'thick', label: 'thick' },
            { value: 'veryThick', label: 'veryThick' },
          ],
        },
        {
          kind: 'range',
          id: 'strokeWidth',
          label: 'strokeWidth',
          defaultValue: 5,
          min: 1,
          max: 14,
          step: 1,
          visibleWhen: { controlId: 'thickness', oneOf: ['custom'] },
        },
        { kind: 'switch', id: 'dashed', label: '虚线', defaultValue: true },
        {
          kind: 'range',
          id: 'dashOffset',
          label: 'dashOffset',
          defaultValue: 0,
          min: -16,
          max: 16,
          step: 1,
          visibleWhen: { controlId: 'dashed', oneOf: [true] },
        },
      ],
    },
    {
      label: '端点、拐点与透明度',
      controls: [
        {
          kind: 'select',
          id: 'lineCap',
          label: 'lineCap',
          defaultValue: 'round',
          options: [
            { value: 'butt', label: 'butt' },
            { value: 'round', label: 'round' },
            { value: 'square', label: 'square' },
          ],
        },
        {
          kind: 'select',
          id: 'lineJoin',
          label: 'lineJoin',
          defaultValue: 'round',
          options: [
            { value: 'miter', label: 'miter' },
            { value: 'round', label: 'round' },
            { value: 'bevel', label: 'bevel' },
          ],
        },
        { kind: 'range', id: 'opacity', label: '整体透明度', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        { kind: 'range', id: 'strokeOpacity', label: '描边透明度', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        { kind: 'range', id: 'fillOpacity', label: '填充透明度', defaultValue: 0.35, min: 0, max: 1, step: 0.05 },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathStyleControls,
  canonicalValues: {
    stroke: '#172033',
    thickness: 'custom',
    strokeWidth: 5,
    dashed: true,
    dashOffset: 0,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 1,
    strokeOpacity: 1,
    fillOpacity: 0.35,
  },
  relatedApis: [
    'Path.stroke',
    'Path.thickness',
    'Path.strokeWidth',
    'Path.opacity',
    'Path.dashPattern',
    'Path.dashOffset',
    'Path.lineCap',
    'Path.lineJoin',
    'Path.strokeOpacity',
    'Path.fillOpacity',
  ],
} satisfies PreviewControlContract;
