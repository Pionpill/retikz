import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowEndpointsI18n } from './flow-endpoints.i18n';

/** 左侧三个节点的独立显示开关 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowEndpointsI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'switch', id: 'first', label: copy.first, defaultValue: true },
          { kind: 'switch', id: 'second', label: copy.second, defaultValue: true },
          { kind: 'switch', id: 'third', label: copy.third, defaultValue: true },
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { first: true, second: true, third: true },
    relatedApis: ['FlowEntities.items', 'FlowRelations.items'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();

export const previewControls = previewControlContract.controls;
