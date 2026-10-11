import { applyTransforms } from '@retikz/data';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import type { ProvenanceEventValues } from './provenance-demo.data';
import { eventOperations, lineageOptionsOf, sourceRows } from './provenance-demo.data';
import { ProvenanceRecordPreview } from './ProvenanceRecordPreview';

/** 记录范围与展示语言 */
export type ProvenanceEventsPreviewProps = ProvenanceEventValues & { lang?: Lang };

/** 配置改变事件内容，计算结果保持不变 */
export const ProvenanceEventsPreview: FC<ProvenanceEventsPreviewProps> = props => {
  const options = lineageOptionsOf(props);
  const { rows, lineage } = applyTransforms(sourceRows, eventOperations, {
    provenance: props.provenance,
    lineage: options,
  });
  return (
    <ProvenanceRecordPreview
      configurationWidth={260}
      eventColumnWidth="16.6667%"
      rows={rows}
      events={lineage?.events ?? []}
      configuration={{ provenance: props.provenance, ...options }}
      lang={props.lang}
    />
  );
};
