import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { DataTransformComparison } from '@/modules/docs/components/data-transform-comparison';

import { provenanceDisplayOf, sourceRows } from './provenance-demo.data';
import { provenanceDemoI18n } from './provenance-demo.i18n';

/** 来源传播试验的操作、来源开关与语言 */
export type ProvenanceRowsPreviewProps = { operation: string; provenance?: boolean; lang?: Lang };

/** 来源列是读取实际 Symbol 后的展示投影，业务行保持原样 */
export const ProvenanceRowsPreview: FC<ProvenanceRowsPreviewProps> = props => {
  const { operation, provenance = true, lang = 'zh' } = props;
  const i18n = provenanceDemoI18n[lang];
  const rows = provenanceDisplayOf(operation, provenance);
  const fields = [...new Set(rows.flatMap(row => Object.keys(row)))];
  return (
    <div className="w-full overflow-x-auto">
      <DataTransformComparison
        operation={operation}
        host={operation === 'sort' ? '' : 'sort →'}
        context={operation === 'sort' ? 'revenue ↑' : 'groupBy: region'}
        source={{
          dataRef: 'source',
          rows: sourceRows.map((row, index) => ({ ...row, index })),
          columns: ['index', 'region', 'period', 'revenue'].map(field => ({ id: field, field, header: field })),
          caption: i18n.source,
          highlight: { columnIds: ['index'] },
        }}
        result={{
          dataRef: 'result',
          rows,
          columns: fields.map(field => ({
            id: field,
            field,
            header: field === 'sourceIndex' ? 'index' : field === 'sourceIndices' ? 'indices' : field,
          })),
          maxColumns: 6,
          caption: i18n.output,
          highlight: { columnIds: ['sourceIndex', 'sourceIndices'] },
        }}
      />
    </div>
  );
};
