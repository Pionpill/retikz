import type { Lang } from '@/i18n';
import { buildPreviewControlDefaults, definePreviewControls } from '@/modules/docs/preview';

import { inspectCustomI18n } from './inspect-custom.i18n';

/** 自定义 optionsSchema 的可见选项 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = inspectCustomI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    sections: [
      { controls: [{ id: 'size', kind: 'range', label: i18n.size, defaultValue: 10, min: 2, max: 24, step: 1 }] },
    ],
  });
  return {
    controls,
    canonicalValues: buildPreviewControlDefaults(controls),
    relatedApis: ['InputInspectorDefinition.optionsSchema'],
  };
};
export const previewControlContract = createPreviewControlContract('zh');
export const previewControls = previewControlContract.controls;
