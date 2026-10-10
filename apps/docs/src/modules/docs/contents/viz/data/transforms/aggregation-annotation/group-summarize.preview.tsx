import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { groupFieldsOf } from './aggregation-annotation.data';
import { transformDemoI18n } from './aggregation-annotation.i18n';
import type { GroupSummarizeValues } from './group-summarize.data';
import { groupSummarizeRowsOf, groupSummarizeResultOf } from './group-summarize.data';

/** 本节预览的控件和语言输入 */
export type GroupSummarizePreviewProps = GroupSummarizeValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const GroupSummarizePreview: FC<GroupSummarizePreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = groupSummarizeRowsOf();
  const result = groupSummarizeResultOf(values);
  const sourceFields = ['team', 'item', 'value'];
  const resultFields = [...groupFieldsOf(values.group), 'stat'];
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
      operation="summarize"
      host="transform"
      context={groupFieldsOf(values.group).join(' + ') || i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'group-summarize-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: { columnIds: ['value'], rowIndices: rows.map((_, index) => index + 1) },
      }}
      result={{
        dataRef: 'group-summarize-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: 3,
        highlight: {
          columnIds: resultFields.filter(field => field !== 'team' && !groupFieldsOf(values.group).includes(field)),
        },
      }}
    />
  );
};
