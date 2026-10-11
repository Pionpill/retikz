import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { groupFieldsOf } from './numeric-derivation.data';
import { transformDemoI18n } from './numeric-derivation.i18n';
import type { NumericNormalizeValues } from './numeric-normalize.data';
import { numericNormalizeRowsOf, numericNormalizeResultOf } from './numeric-normalize.data';

/** 本节预览的控件和语言输入 */
export type NumericNormalizePreviewProps = NumericNormalizeValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const NumericNormalizePreview: FC<NumericNormalizePreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = numericNormalizeRowsOf();
  const result = numericNormalizeResultOf(values);
  const sourceFields = ['team', 'item', 'value'];
  const resultFields = values.overwrite ? ['team', 'item', 'value'] : ['team', 'item', 'value', 'share'];
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
      operation="normalize"
      host="transform"
      context={groupFieldsOf(values.group).join(' + ') || i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'numeric-normalize-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: { columnIds: ['value'], rowIndices: rows.map((_, index) => index + 1) },
      }}
      result={{
        dataRef: 'numeric-normalize-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: 4,
        highlight: { columnIds: [values.overwrite ? 'value' : 'share'] },
      }}
    />
  );
};
