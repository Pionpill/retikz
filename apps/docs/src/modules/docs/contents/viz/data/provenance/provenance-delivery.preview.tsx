import type { DataLineageEvent } from '@retikz/data';
import { applyTransforms } from '@retikz/data';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { provenanceOperationsOf, sourceRows } from './provenance-demo.data';
import { ProvenanceRecordPreview } from './ProvenanceRecordPreview';

/** 回调与返回值保留选项 */
export type ProvenanceDeliveryPreviewProps = { sink: boolean; retain: boolean; lang?: Lang };
/** 回调只收集到当前调用的局部数组，不发送外部消息 */
export const ProvenanceDeliveryPreview: FC<ProvenanceDeliveryPreviewProps> = props => {
  const { sink, retain, lang } = props;
  const delivered: Array<DataLineageEvent> = [];
  const { rows, lineage } = applyTransforms(sourceRows, provenanceOperationsOf('summarize'), {
    provenance: true,
    lineage: { ...(sink ? { sink: event => delivered.push(event) } : {}), retainEvents: retain },
  });
  const retained = lineage?.events ?? [];
  return (
    <ProvenanceRecordPreview
      rows={rows}
      events={sink ? delivered : retained}
      delivery={{ delivered, retained }}
      lang={lang}
      configuration={{ provenance: true, sink: sink ? 'event => delivered.push(event)' : '-', retainEvents: retain }}
    />
  );
};
