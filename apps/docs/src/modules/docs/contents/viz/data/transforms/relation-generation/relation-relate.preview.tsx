import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { transformDemoI18n } from './relation-generation.i18n';
import type { RelationRelateValues } from './relation-relate.data';
import { relationRelateRowsOf, relationRelateResultOf } from './relation-relate.data';

/** 本节预览的控件和语言输入 */
export type RelationRelatePreviewProps = RelationRelateValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const RelationRelatePreview: FC<RelationRelatePreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = relationRelateRowsOf();
  const result = relationRelateResultOf(values);
  const sourceFields = ['team', 'record', 'value'];
  const resultFields = [
    ...(values.grouped ? ['team'] : []),
    'sourceId',
    'targetId',
    ...(values.measure ? ['delta'] : []),
  ];
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
      operation="relate"
      host="transform"
      context={values.grouped ? 'groupBy: team' : i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'relation-relate-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: {
          columnIds: ['record', 'value'],
          rowIndices: result.flatMap(row =>
            rows.flatMap((sourceRow, index) =>
              sourceRow.record === row.sourceId || sourceRow.record === row.targetId ? [index + 1] : [],
            ),
          ),
        },
      }}
      result={{
        dataRef: 'relation-relate-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: 4,
        highlight: { columnIds: resultFields.filter(field => field !== 'team') },
      }}
    />
  );
};
