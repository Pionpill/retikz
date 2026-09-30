import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowRoutingI18n } from './flow-routing.i18n';

/** 当前语言的折线路由面板 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowRoutingI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'select', id: 'kind', label: copy.kind, defaultValue: '-|', options: copy.kindOptions },
          {
            kind: 'range',
            id: 'cornerRadius',
            label: copy.radius,
            defaultValue: 0,
            min: 0,
            max: 24,
            step: 4,
            visibleWhen: { controlId: 'kind', oneOf: ['orthogonal', '-|', '|-'] },
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { kind: '-|', cornerRadius: 0 },
    relatedApis: ['FlowRelation.routing.kind', 'FlowRelation.routing.cornerRadius'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;
