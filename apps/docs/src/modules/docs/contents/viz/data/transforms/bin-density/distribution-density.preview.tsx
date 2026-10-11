import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { transformDemoI18n } from './bin-density.i18n';
import type { DistributionDensityValues } from './distribution-density.data';
import { distributionDensityRowsOf, distributionDensityResultOf } from './distribution-density.data';

/** 本节预览的控件和语言输入 */
export type DistributionDensityPreviewProps = DistributionDensityValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const DistributionDensityPreview: FC<DistributionDensityPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = distributionDensityRowsOf();
  const result = distributionDensityResultOf(values);
  const sourceFields = ['team', 'value'];
  const resultFields = [...(values.grouped ? ['team'] : []), 'sample', 'density'];
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
      operation="density"
      host="transform"
      context={values.grouped ? 'groupBy: team' : i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'distribution-density-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: { columnIds: ['value'], rowIndices: rows.map((_, index) => index + 1) },
      }}
      result={{
        dataRef: 'distribution-density-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: 3,
        highlight: { columnIds: resultFields.filter(field => field !== 'team') },
      }}
    />
  );
};
