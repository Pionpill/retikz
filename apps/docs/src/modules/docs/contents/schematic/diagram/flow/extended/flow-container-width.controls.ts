import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { flowContainerWidthI18n } from './flow-container-width.i18n';

/** 同级等宽与内部填充分别控制 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const copy = flowContainerWidthI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: copy.title,
    sections: [
      {
        controls: [
          { kind: 'switch', id: 'equal', label: copy.equal, defaultValue: true },
          { kind: 'switch', id: 'fill', label: copy.fill, defaultValue: true },
          { kind: 'switch', id: 'group', label: copy.group, defaultValue: false },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { equal: true, fill: true, group: false },
    relatedApis: ['FlowLayout.containerWidth', 'FlowLayout.itemWidth'],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const previewControls = previewControlContract.controls;
