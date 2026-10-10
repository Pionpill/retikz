import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { transformDemoI18n } from './trend-sampling.i18n';
import type { TrendSmoothValues } from './trend-smooth.data';
import { trendSmoothRowsOf, trendSmoothResultOf } from './trend-smooth.data';

/** 本节预览的控件和语言输入 */
export type TrendSmoothPreviewProps = TrendSmoothValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const TrendSmoothPreview: FC<TrendSmoothPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = trendSmoothRowsOf();
  const result = trendSmoothResultOf(values);
  const sourceFields = ['team', 'x', 'y'];
  const resultFields = [...(values.grouped ? ['team'] : []), 'trendX', 'trendY'];
  const columnsOf = (fields: Array<string>): DataTransformComparisonTable['columns'] =>
    fields.map(field => ({
      id: field,
      field,
      header: field,
      ...(!['team', 'item', 'record', 'sourceId', 'targetId'].includes(field)
        ? { formatter: { name: 'number', options: { specifier: '.3~f' } } }
        : {}),
    }));
  return (
    <DataTransformComparison
      operation="smooth"
      host="transform"
      context={values.grouped ? 'groupBy: team' : i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'trend-smooth-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: { columnIds: ['x', 'y'], rowIndices: rows.map((_, index) => index + 1) },
      }}
      result={{
        dataRef: 'trend-smooth-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: 3,
        highlight: { columnIds: resultFields.filter(field => field !== 'team') },
      }}
    />
  );
};
