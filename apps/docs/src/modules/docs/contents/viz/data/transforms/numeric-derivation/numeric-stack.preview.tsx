import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { transformDemoI18n } from './numeric-derivation.i18n';
import type { NumericStackValues } from './numeric-stack.data';
import { numericStackRowsOf, numericStackResultOf } from './numeric-stack.data';

/** 本节预览的控件和语言输入 */
export type NumericStackPreviewProps = NumericStackValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const NumericStackPreview: FC<NumericStackPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = numericStackRowsOf();
  const result = numericStackResultOf(values);
  const sourceFields = ['team', 'item', 'value'];
  const resultFields = ['team', 'item', 'value', 'y0', 'y1'];
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
      operation="stack"
      host="transform"
      context={values.grouped ? 'x: team' : i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'numeric-stack-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: { columnIds: ['value'], rowIndices: rows.map((_, index) => index + 1) },
      }}
      result={{
        dataRef: 'numeric-stack-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: resultFields.length,
        highlight: { columnIds: resultFields.filter(field => field !== 'team' && !sourceFields.includes(field)) },
      }}
    />
  );
};
