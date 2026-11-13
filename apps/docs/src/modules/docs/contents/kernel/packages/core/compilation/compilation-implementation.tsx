import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationImplementationI18n } from './compilation-implementation.i18n';

/** 实体编译依赖图的语言 */
export type CompilationImplementationProps = { lang?: Lang };

/** 展示实体处理、子布局与目标几何的依赖 */
const CompilationImplementation: FC<CompilationImplementationProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationImplementationI18n[lang];
  const stages = [
    { id: 'input', name: 'IRScene', state: true },
    { id: 'scope', name: 'prepareScopePlacement', state: false },
    { id: 'node', name: 'compileNode', state: false },
    { id: 'coordinate', name: 'compileCoordinate', state: false },
    { id: 'envelope', name: 'compileScope', state: false },
    { id: 'path', name: 'compilePath', state: false },
    { id: 'scene', name: 'Scene', state: true },
  ] as const;
  const dependencies = [
    ['input', 'scope'],
    ['scope', 'node'],
    ['scope', 'coordinate'],
    ['node', 'envelope'],
    ['coordinate', 'envelope'],
    ['envelope', 'path'],
    ['path', 'scene'],
  ] as const;
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="compilation-implementation"
        kind="grid"
        gap={{ row: 24, column: 32 }}
        placements={[
          ['input', 'scope'],
          ['node', 'coordinate'],
          ['envelope', 'path'],
          [null, 'scene'],
        ]}
      >
        <FlowEntities
          items={stages.map(item => ({
            id: item.id,
            role: item.state ? 'state' : 'activity',
            layout: { width: 250 },
            text: [
              { text: item.name, font: { size: 12 } },
              { text: text[item.id], font: { size: 12 }, fill: 'gray' },
            ],
          }))}
        />
      </FlowLayout>
      <FlowRelations
        items={dependencies.map(([source, target]) => ({
          source: { id: source },
          target: { id: target },
        }))}
      />
    </PreviewFlowDiagram>
  );
};
export default CompilationImplementation;
