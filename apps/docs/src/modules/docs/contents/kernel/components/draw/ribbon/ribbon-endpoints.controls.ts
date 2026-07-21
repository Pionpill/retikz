import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Ribbon 端点 playground 的中文属性面板 */
export const ribbonEndpointsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon 端点',
  sections: [
    {
      label: '方向与对齐',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: '端点方向',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '自动切线' },
            { value: 'angle', label: '角度' },
            { value: 'vector', label: '向量' },
            { value: 'polar', label: '极坐标向量' },
          ],
        },
        {
          kind: 'range',
          id: 'angle',
          label: '角度',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: { controlId: 'direction', oneOf: ['angle', 'vector', 'polar'] },
        },
        {
          kind: 'select',
          id: 'align',
          label: 'align',
          defaultValue: 'center',
          options: [
            { value: 'left', label: 'left' },
            { value: 'center', label: 'center' },
            { value: 'right', label: 'right' },
          ],
        },
      ],
    },
    {
      label: '端帽',
      controls: [
        {
          kind: 'select',
          id: 'cap',
          label: 'cap',
          defaultValue: 'round',
          options: [
            { value: 'butt', label: 'butt' },
            { value: 'square', label: 'square' },
            { value: 'round', label: 'round' },
            { value: 'arc', label: 'arc' },
          ],
        },
        { kind: 'range', id: 'width', label: '宽度', defaultValue: 30, min: 8, max: 60, step: 2 },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: ribbonEndpointsControls,
  canonicalValues: { direction: 'auto', angle: 0, align: 'center', cap: 'round', width: 30 },
  relatedApis: ['Path.kind', 'Path.ribbon'],
} satisfies PreviewControlContract;
