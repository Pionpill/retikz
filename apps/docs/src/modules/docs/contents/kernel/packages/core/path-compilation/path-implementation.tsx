import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { pathImplementationI18n } from './path-implementation.i18n';

/** Reconciler 调度 resolvePath / compilePath流程图的语言 */
export type PathImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const PathImplementation: FC<PathImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathImplementationI18n[lang];
  const stages = [
    { id: 'flush', name: 'flushPendingPathEmissions', state: false },
    { id: 'bind', name: 'bindPathTargets', state: false },
    { id: 'host', name: 'emitDefinedPath', state: false },
    { id: 'stroke', name: 'PathDefinition.compile', state: false },
    { id: 'snapshot', name: 'snapshotPathCompileResult', state: true },
  ] as const;
  const inputs = [{ id: 'builtin', name: 'Custom definition', target: 'stroke' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="path-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'flush'],
          [null, 'bind'],
          [null, 'host'],
          ['builtin', 'stroke'],
          [null, 'snapshot'],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.state ? 'state' : 'activity',
            layout: { width: 290 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
        <FlowEntities
          items={inputs.map(item => ({
            id: item.id,
            role: 'state',
            kind: 'docs.logic.secondary',
            layout: { width: 230 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ...stages.slice(1).map((item, index) => ({
            source: { id: stages[index].id, anchor: 'bottom' as const },
            target: { id: item.id, anchor: 'top' as const },
          })),
          ...inputs.map(item => ({
            source: { id: item.id, anchor: 'right' as const },
            target: { id: item.target, anchor: 'left' as const },
          })),
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default PathImplementation;
