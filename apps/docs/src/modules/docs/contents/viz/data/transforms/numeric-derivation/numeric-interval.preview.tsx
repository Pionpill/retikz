import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { transformDemoI18n } from './numeric-derivation.i18n';
import type { NumericIntervalValues } from './numeric-interval.data';
import { numericIntervalRowsOf, numericIntervalResultOf } from './numeric-interval.data';

/** 本节预览的控件和语言输入 */
export type NumericIntervalPreviewProps = NumericIntervalValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const NumericIntervalPreview: FC<NumericIntervalPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = numericIntervalRowsOf();
  const result = numericIntervalResultOf(values);
  const sourceFields = ['team', 'low', 'value'];
  const resultFields = ['team', 'low', 'value', 'y0', 'y1'];
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
      operation="derive-interval"
      host="transform"
      context={values.mode === 'fields' ? i18n.fieldsMode : i18n.baselineMode}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'numeric-interval-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: {
          columnIds: values.mode === 'fields' ? ['low', 'value'] : ['value'],
          rowIndices: rows.map((_, index) => index + 1),
        },
      }}
      result={{
        dataRef: 'numeric-interval-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: resultFields.length,
        highlight: { columnIds: resultFields.filter(field => field !== 'team' && !sourceFields.includes(field)) },
      }}
    />
  );
};
