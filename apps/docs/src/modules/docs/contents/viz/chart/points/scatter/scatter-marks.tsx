import { ScatterChart, ScatterEncodings, ScatterMark, ScatterProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scatterMarksI18n } from './scatter-marks.i18n';
import { scatterMinimalData } from './scatter-minimal.data';

/** 散点图元示例的语言选项 */
export type ScatterMarksProps = { lang?: Lang };

/** 叠加两组继承相同位置映射的散点 */
const ScatterMarks: FC<ScatterMarksProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = scatterMarksI18n[lang];
  return (
    <ScatterChart
      rows={scatterMinimalData}
      layout={{ width: 720, height: 440 }}
      presentation={{ title: { text: i18n.title }, subtitle: { text: i18n.subtitle } }}
    >
      <ScatterEncodings x="imdbRating" y="rottenTomatoesRating" />
      <ScatterProperties size={8} opacity={0.25} />
      <ScatterMark properties={{ size: 3, opacity: 1 }} />
    </ScatterChart>
  );
};

/** 源码视图复用电影评分数据 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

export default ScatterMarks;
