import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { measurementCacheI18n } from './measurement-cache.i18n';

/** 展示同一测量请求首次试算与再次命中后的两条路径 */
const MeasurementCache: FC<{ lang?: Lang }> = props => {
  const { lang = 'zh' } = props;
  const labels = measurementCacheI18n[lang];
  const stages = [
    { id: 'first', member: 'measureChild(A, proposal, "x")' },
    { id: 'probe', member: 'evaluateCompositeLayout' },
    { id: 'write', member: 'setMeasurement(key, result)' },
    { id: 'again', member: 'measureChild(A, proposal, "x")' },
    { id: 'hit', member: 'getMeasurement(key)' },
    { id: 'read', member: '{ axis: "x", width: 80 }' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="measurement-cache"
        kind="grid"
        gap={{ row: 20, column: 24 }}
        placements={[
          ['first', 'probe', 'write'],
          ['again', 'hit', 'read'],
        ]}
      >
        <FlowEntities
          items={stages.map(({ id, member }) => ({
            id,
            role: 'activity',
            layout: { width: 198 },
            text: [{ text: labels[id] }, { text: member, font: { size: 12 }, fill: 'gray' }],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ['first', 'probe'],
          ['probe', 'write'],
          ['again', 'hit'],
          ['hit', 'read'],
        ].map(([source, target]) => ({ source: { id: source }, target: { id: target } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default MeasurementCache;
