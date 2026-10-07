import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { treeConnectionsI18n } from './tree-connections.i18n';

/** 连接路由及外部引用的共享预览契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = treeConnectionsI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              id: 'route',
              kind: 'select',
              label: t.route,
              defaultValue: '-|-',
              options: [
                { value: 'straight', label: t.straight },
                { value: '-|', label: '-|' },
                { value: '|-', label: '|-' },
                { value: '-|-', label: '-|-' },
                { value: '|-|', label: '|-|' },
              ],
            },
            {
              id: 'fraction',
              kind: 'range',
              label: t.fraction,
              defaultValue: 0.5,
              min: 0,
              max: 1,
              step: 0.05,
              visibleWhen: { controlId: 'route', oneOf: ['-|-', '|-|'] },
            },
            { id: 'arrows', kind: 'switch', label: t.arrows, defaultValue: true },
            { id: 'reference', kind: 'switch', label: t.reference, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { route: '-|-', fraction: 0.5, arrows: true, reference: true },
    relatedApis: ['Tree.connection', 'Tree.root', 'Draw.way'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract('zh');
