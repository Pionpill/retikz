import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowPresentationI18n } from './flow-presentation.i18n';

/** 整图说明区域的独立显示开关 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowPresentationI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.controlsTitle,
    sections: [
      {
        controls: [
          { kind: 'switch', id: 'title', label: copy.title, defaultValue: true },
          { kind: 'switch', id: 'description', label: copy.description, defaultValue: true },
          { kind: 'switch', id: 'legend', label: copy.legend, defaultValue: true },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { title: true, description: true, legend: true },
    relatedApis: ['FlowDiagram.presentation'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;
