import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { queueI18n } from './queue-layout.i18n';

/** 本节公开参数与稳定默认值 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = queueI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              id: 'direction',
              kind: 'select',
              label: t.direction,
              defaultValue: 'right',
              options: [
                { value: 'up', label: t.up },
                { value: 'down', label: t.down },
                { value: 'left', label: t.left },
                { value: 'right', label: t.right },
              ],
            },
            { id: 'border', kind: 'switch', label: t.border, defaultValue: true },
            {
              id: 'padding',
              kind: 'select',
              label: t.padding,
              defaultValue: '8',
              options: [
                { value: '0', label: '0' },
                { value: '8', label: '8' },
                { value: '16', label: '16' },
              ],
            },
            {
              id: 'count',
              kind: 'select',
              label: t.count,
              defaultValue: '3',
              options: [
                { value: '0', label: '0' },
                { value: '1', label: '1' },
                { value: '3', label: '3' },
              ],
            },
            { id: 'input', kind: 'switch', label: t.input, defaultValue: true },
            { id: 'output', kind: 'switch', label: t.output, defaultValue: true },
            { id: 'styled', kind: 'switch', label: t.styled, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: {
      direction: 'right',
      border: true,
      padding: '8',
      input: true,
      output: true,
      styled: false,
      count: '3',
    },
    relatedApis: ['Queue.layout'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
