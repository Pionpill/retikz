import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { runtimeStorageI18n } from './runtime-storage.i18n';

/** 运行环境图的显示语言 */
export type RuntimeStorageProps = { lang?: Lang };

/** 区分本次执行读取的能力与写入的状态 */
const RuntimeStorage: FC<RuntimeStorageProps> = props => {
  const { lang = 'zh' } = props;
  const labels = runtimeStorageI18n[lang];
  const stages = [
    { id: 'root', member: 'CompileRuntime' },
    { id: 'context', member: 'context' },
    { id: 'state', member: 'state' },
    { id: 'measure', member: 'context.host.measureText' },
    { id: 'geometry', member: 'state.execution.namespaceStack' },
    { id: 'resources', member: 'state.workspace' },
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="runtime-storage"
        kind="grid"
        gap={{ row: 24, column: 32 }}
        placements={[
          [null, 'root', null],
          ['context', null, 'state'],
          ['measure', 'resources', 'geometry'],
        ]}
      >
        <FlowEntities
          items={stages.map(({ id, member }) => ({
            id,
            role: 'activity',
            layout: { width: 220 },
            text: [{ text: labels[id] }, { text: member, font: { size: 12 }, fill: 'gray' }],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          ['root', 'context'],
          ['root', 'state'],
          ['context', 'measure'],
          ['state', 'geometry'],
          ['state', 'resources'],
        ].map(([source, target]) => ({ source: { id: source }, target: { id: target } }))}
      />
    </PreviewFlowDiagram>
  );
};
export default RuntimeStorage;
