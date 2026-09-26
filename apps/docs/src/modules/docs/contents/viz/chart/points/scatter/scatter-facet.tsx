import { ScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scatterFacetI18n } from './scatter-facet.i18n';
import { fertilityWorkData } from './scatter-fertility-work.data';

/** 分面示例的语言选项 */
export type ScatterFacetProps = { lang?: Lang };

/** 同一份经济体数据按收入组分面，保持共享坐标尺度 */
const ScatterFacet: FC<ScatterFacetProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = scatterFacetI18n[lang];
  return (
    <ScatterChart
      rows={fertilityWorkData}
      layout={{ width: 720, height: 360 }}
      presentation={{ title: { text: i18n.title }, subtitle: { text: i18n.subtitle } }}
      recipe={{
        encodings: {
          x: 'fertilityRate',
          y: 'femaleLaborParticipation',
          column: { field: 'incomeGroup', order: ['HIC', 'UMC', 'LMC', 'LIC'] },
          facet: { header: { column: true }, spacing: { panelGap: 20 } },
        },
        properties: { size: 4, opacity: 0.65 },
      }}
    />
  );
};

/** 源码视图与分类编码示例共用同一份数据 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'fertilityWorkData', from: './scatter-fertility-work.data' } },
};

export default ScatterFacet;
