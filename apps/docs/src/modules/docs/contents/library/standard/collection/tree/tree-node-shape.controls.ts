import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { treeNodeShapeI18n } from './tree-node-shape.i18n';

/** 局部节点形状的共享预览契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = treeNodeShapeI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              id: 'shape',
              kind: 'select',
              label: t.shape,
              defaultValue: 'rectangle',
              options: [
                { value: 'rectangle', label: t.rectangle },
                { value: 'ellipse', label: t.ellipse },
              ],
            },
            {
              id: 'cornerRadius',
              kind: 'range',
              label: t.cornerRadius,
              defaultValue: 8,
              min: 0,
              max: 16,
              step: 1,
              visibleWhen: { controlId: 'shape', oneOf: ['rectangle'] },
            },
            {
              id: 'content',
              kind: 'select',
              label: t.content,
              defaultValue: 'Review the complete request',
              options: [
                { value: 'Review', label: t.short },
                { value: 'Review the complete request', label: t.long },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { shape: 'rectangle', cornerRadius: 8, content: 'Review the complete request' },
    relatedApis: ['Tree.root', 'Tree.node'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
