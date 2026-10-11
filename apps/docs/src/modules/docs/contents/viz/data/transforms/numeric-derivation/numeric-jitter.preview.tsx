import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { transformDemoI18n } from './numeric-derivation.i18n';
import type { NumericJitterValues } from './numeric-jitter.data';
import { numericJitterRowsOf, numericJitterResultOf } from './numeric-jitter.data';

/** 本节预览的控件和语言输入 */
export type NumericJitterPreviewProps = NumericJitterValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const NumericJitterPreview: FC<NumericJitterPreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = numericJitterRowsOf();
  const result = numericJitterResultOf(values);
  const sourceFields = ['team', 'x', 'y'];
  const resultFields = ['team', 'x', 'y'];
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
      operation="jitter"
      host="transform"
      context={`seed: ${values.seed}`}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'numeric-jitter-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: {
          columnIds: values.axis === 'both' ? ['x', 'y'] : [values.axis],
          rowIndices: rows.map((_, index) => index + 1),
        },
      }}
      result={{
        dataRef: 'numeric-jitter-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: resultFields.length,
        highlight: { columnIds: values.axis === 'both' ? ['x', 'y'] : [values.axis] },
      }}
    />
  );
};
