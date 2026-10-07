import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { treeI18n } from './tree-layout.i18n';

/** 方向和外观的共享预览契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = treeI18n[lang];
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
              defaultValue: 'down',
              options: [
                { value: 'down', label: t.down },
                { value: 'up', label: t.up },
                { value: 'left', label: t.left },
                { value: 'right', label: t.right },
              ],
            },
            {
              id: 'gap',
              kind: 'select',
              label: t.gap,
              defaultValue: '32',
              options: [
                { value: '0', label: '0' },
                { value: '32', label: '32' },
                { value: '64', label: '64' },
              ],
            },
            { id: 'empty', kind: 'switch', label: t.empty, defaultValue: false },
            { id: 'missing', kind: 'switch', label: t.missing, defaultValue: true },
            { id: 'arrows', kind: 'switch', label: t.arrows, defaultValue: true },
            { id: 'styled', kind: 'switch', label: t.styled, defaultValue: false },
          ],
        },
      ],
    }),
    canonicalValues: {
      direction: 'down',
      gap: '32',
      empty: false,
      missing: true,
      arrows: true,
      styled: false,
    },
    relatedApis: ['Tree.root', 'Tree.layout', 'Tree.node', 'Tree.connection'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
