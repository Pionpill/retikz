import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { outputImplementationI18n } from './output-implementation.i18n';

/** 以根 IR 启动子树编译与结果收集流程图的语言 */
export type OutputImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const OutputImplementation: FC<OutputImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = outputImplementationI18n[lang];
  const stages = [
    { id: 'manager', name: 'compileScene', state: false },
    { id: 'subtree', name: 'assembleCompileSubtree', state: false },
    { id: 'assemble', name: 'finalizeSceneCompilation', state: false },
    { id: 'publish', name: 'SceneReconciler', state: true },
  ] as const;
  const inputs = [{ id: 'options', name: 'IRScene + options', target: 'manager' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="output-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          ['options', 'manager'],
          [null, 'subtree'],
          [null, 'assemble'],
          [null, 'publish'],
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
export default OutputImplementation;
