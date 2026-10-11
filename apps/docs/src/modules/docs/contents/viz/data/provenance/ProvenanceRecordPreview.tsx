import type { DataLineageEvent, ExternalRow } from '@retikz/data';
import { readSourceIndices } from '@retikz/data';
import { Layout } from '@retikz/react';
import { DetailColumn } from '@retikz/table-react';
import type { CSSProperties, FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewDetailTable } from '@/modules/docs/components/component-preview/theme';

import { provenanceDemoI18n } from './provenance-demo.i18n';

/** 结果、配置和事件来自同一次执行 */
export type ProvenanceRecordPreviewProps = {
  rows: Array<ExternalRow>;
  configuration: Record<string, unknown>;
  events: Array<DataLineageEvent>;
  delivery?: { delivered: Array<DataLineageEvent>; retained: Array<DataLineageEvent> };
  lang?: Lang;
  /** 左侧配置表宽度，默认与结果表等宽 */
  configurationWidth?: number;
  /** 事件类型列宽度，省略时均分 */
  eventColumnWidth?: string;
};

/** 用结果表、配置清单和事件表对照一次溯源执行 */
export const ProvenanceRecordPreview: FC<ProvenanceRecordPreviewProps> = props => {
  const { rows, configuration, events, delivery, lang = 'zh', configurationWidth = 210, eventColumnWidth } = props;
  const i18n = provenanceDemoI18n[lang];
  const displayRows = rows.map(row => ({ ...row, indices: JSON.stringify(readSourceIndices(row) ?? []) }));
  return (
    <div className="h-full w-full min-w-0 overflow-auto p-1 text-left text-xs select-text">
      <div
        className="grid min-w-0 grid-cols-1 items-stretch gap-4 @min-[640px]:grid-cols-[var(--configuration-width)_minmax(0,1fr)]"
        style={{ '--configuration-width': `${configurationWidth}px` } as CSSProperties}
      >
        <section className="min-w-0" style={{ width: configurationWidth }}>
          <h3 className="mb-2 text-sm font-medium">{i18n.output}</h3>
          <div className="overflow-x-auto">
            <Layout
              theme={{ style: 'docs.logic' }}
              viewBox={{ x: 0, y: 0, width: 210, height: (rows.length + 1) * 26 }}
            >
              <PreviewDetailTable
                id="lineage-result"
                dataRef="result"
                data={displayRows}
                layout={{
                  columnSize: { kind: 'fixed', value: 70 },
                  rowSize: { kind: 'fixed', value: 26 },
                  headerRowSize: { kind: 'fixed', value: 26 },
                }}
              >
                {['region', 'total', 'indices'].map(field => (
                  <DetailColumn key={field} id={field} field={field} header={field} />
                ))}
              </PreviewDetailTable>
            </Layout>
          </div>
          <h3 className="mt-4 mb-2 text-sm font-medium">{i18n.configuration}</h3>
          <div className="rounded-md border">
            <table className="w-full table-fixed border-collapse">
              <tbody>
                {Object.entries(configuration).map(([key, value]) => (
                  <tr key={key} className="border-b last:border-0">
                    <th className="px-2 py-1.5 text-left align-top font-mono font-normal [overflow-wrap:anywhere]">
                      {key}
                    </th>
                    <td className="px-2 py-1.5 break-all font-mono">{JSON.stringify(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="relative min-h-80 min-w-0 @min-[640px]:min-h-0">
          <div className="absolute inset-0 flex min-h-0 flex-col">
            <h3 className="mb-2 shrink-0 text-sm font-medium">
              {i18n.records} · {events.length}
            </h3>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <table className="w-full table-fixed border-collapse">
                {delivery ? (
                  <colgroup>
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '50%' }} />
                    <col style={{ width: '12.5%' }} />
                    <col style={{ width: '12.5%' }} />
                  </colgroup>
                ) : eventColumnWidth ? (
                  <colgroup>
                    <col style={{ width: eventColumnWidth }} />
                    <col />
                  </colgroup>
                ) : null}
                <thead>
                  <tr className="border-b bg-muted/30">
                    {[i18n.eventType, i18n.eventContent, ...(delivery ? [i18n.delivered, i18n.retained] : [])].map(
                      label => (
                        <th key={label} className="px-2 py-2 text-left font-medium whitespace-nowrap">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-2 py-2 align-top font-mono [overflow-wrap:anywhere]">{event.kind}</td>
                      <td className="px-2 py-2 align-top">
                        <dl className="space-y-1">
                          {Object.entries(event)
                            .filter(([key]) => key !== 'kind')
                            .map(([key, value]) => (
                              <div key={key} className="flex flex-wrap gap-x-2">
                                <dt className="font-mono text-muted-foreground">{key}</dt>
                                <dd className="break-all font-mono">{JSON.stringify(value)}</dd>
                              </div>
                            ))}
                        </dl>
                      </td>
                      {delivery && (
                        <>
                          <td className="px-2 py-2 align-top">{delivery.delivered.includes(event) ? '✓' : '-'}</td>
                          <td className="px-2 py-2 align-top">{delivery.retained.includes(event) ? '✓' : '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
