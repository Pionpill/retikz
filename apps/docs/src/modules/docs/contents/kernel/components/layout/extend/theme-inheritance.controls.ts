import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { themeInheritanceI18n } from './theme-inheritance.i18n';

/** Localized controls for the same theme-aware card */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = themeInheritanceI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.title,
      sections: [
        {
          label: i18n.title,
          controls: [
            {
              kind: 'select',
              id: 'style',
              label: i18n.style,
              defaultValue: 'academic',
              options: [
                { value: 'default', label: i18n.default },
                { value: 'academic', label: i18n.academic },
                { value: 'vibrant', label: i18n.vibrant },
                { value: 'clean', label: i18n.clean },
              ],
            },
            {
              kind: 'select',
              id: 'mode',
              label: i18n.mode,
              defaultValue: 'light',
              options: [
                { value: 'light', label: i18n.light },
                { value: 'dark', label: i18n.dark },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { style: 'academic', mode: 'light' },
    relatedApis: ['Layout.theme'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
