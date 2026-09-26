import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { scatterFacetI18n } from './scatter-facet.i18n';
import { fertilityWorkData } from './scatter-fertility-work.data';

/** 分面示例的数据查询面板 */
export const createPreviewControlContract = (lang: Lang): PreviewControlContract => {
  const i18n = scatterFacetI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.data,
      sections: [
        {
          label: i18n.data,
          defaultCollapsed: true,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: i18n.data,
              rows: fertilityWorkData,
              columns: [
                { key: 'country' },
                { key: 'incomeGroup' },
                { key: 'fertilityRate' },
                { key: 'femaleLaborParticipation' },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: {},
    relatedApis: ['ScatterEncodings.column', 'ScatterEncodings.facet'],
  };
};
