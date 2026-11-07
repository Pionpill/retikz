import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationImplementationI18n } from './compilation-implementation.i18n';

/** 启动根子树执行流程图的语言 */
export type CompilationImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const CompilationImplementation: FC<CompilationImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationImplementationI18n[lang];
  const stages = [
    { id: 'manager', name: 'CompileManager.compileScene', state: false },
    { id: 'run', name: 'SubtreeCompiler.run', state: false },
    { id: 'dispatch', name: 'SubtreeCompiler.compileChild', state: false },
    { id: 'flush', name: 'flushPendingPathEmissions', state: false },
    { id: 'assemble', name: 'assembleSceneCompilationSnapshot', state: true },
  ] as const;
  const inputs = [{ id: 'registry', name: 'CompileRuntime', target: 'manager' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="compilation-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          ['registry', 'manager'],
          [null, 'run'],
          [null, 'dispatch'],
          [null, 'flush'],
          [null, 'assemble'],
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
          ...stages
            .slice(1)
            .map((item, index) => ({
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
export default CompilationImplementation;
