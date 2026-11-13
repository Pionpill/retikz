import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { definitionImplementationI18n } from './definition-implementation.i18n';

/** 按 shapes、paths、composites 分类流程图的语言 */
export type DefinitionImplementationProps = { lang?: Lang };

/** 展示本页追踪的阶段、产物与必要输入 */
const DefinitionImplementation: FC<DefinitionImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = definitionImplementationI18n[lang];
  const stages = [
    { id: 'options', name: 'CompileOptions', state: true },
    { id: 'registry', name: 'createSharedCompileContext', state: false },
    { id: 'bind', name: 'resolveNode / resolvePath / bindComposite', state: false },
    { id: 'result', name: 'Canonical / Resolution', state: true },
    { id: 'execute', name: 'Core stages + Reconciler', state: false },
  ] as const;
  const inputs = [{ id: 'builtins', name: 'providers/', target: 'registry' }] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="definition-implementation"
        kind="grid"
        gap={{ row: 20, column: 28 }}
        placements={[
          [null, 'options'],
          ['builtins', 'registry'],
          [null, 'bind'],
          [null, 'result'],
          [null, 'execute'],
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
export default DefinitionImplementation;
