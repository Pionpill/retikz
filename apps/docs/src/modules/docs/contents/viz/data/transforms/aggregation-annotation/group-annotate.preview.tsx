import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';
import type { DataTransformComparisonTable } from '@/modules/docs/components/data-transform-comparison';

import { groupFieldsOf } from './aggregation-annotation.data';
import { transformDemoI18n } from './aggregation-annotation.i18n';
import type { GroupAnnotateValues } from './group-annotate.data';
import { groupAnnotateRowsOf, groupAnnotateResultOf } from './group-annotate.data';

/** 本节预览的控件和语言输入 */
export type GroupAnnotatePreviewProps = GroupAnnotateValues & { lang?: Lang };
/** 使用 Table 展示真实输入与输出，team 不参与色彩标记 */
export const GroupAnnotatePreview: FC<GroupAnnotatePreviewProps> = props => {
  const { lang = 'zh', ...values } = props;
  const i18n = transformDemoI18n[lang];
  const rows = groupAnnotateRowsOf();
  const result = groupAnnotateResultOf(values);
  const sourceFields = ['team', 'item', 'value'];
  const resultFields = ['team', 'item', 'value', values.mode === 'selector' ? 'peak' : 'total'];
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
      operation="annotate"
      host="transform"
      context={groupFieldsOf(values.group).join(' + ') || i18n.global}
      emptyLabel={i18n.empty}
      source={{
        dataRef: 'group-annotate-source',
        rows,
        columns: columnsOf(sourceFields),
        caption: i18n.source,
        highlight: { columnIds: ['value'], rowIndices: rows.map((_, index) => index + 1) },
      }}
      result={{
        dataRef: 'group-annotate-result',
        rows: result,
        columns: columnsOf(resultFields),
        caption: i18n.result,
        maxColumns: 4,
        highlight: { columnIds: resultFields.filter(field => field !== 'team' && !sourceFields.includes(field)) },
      }}
    />
  );
};
