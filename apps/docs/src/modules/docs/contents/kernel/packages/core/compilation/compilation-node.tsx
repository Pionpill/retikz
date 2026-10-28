import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { compilationNodeI18n } from './compilation-node.i18n';

/** Node 编译流程图的语言 */
export type CompilationNodeProps = { lang?: Lang };

/** 展示 Node IR 经解析、布局和生成得到 Scene 图元 */
const CompilationNode: FC<CompilationNodeProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationNodeI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout
        id="nodeCompilation"
        kind="grid"
        gap={{ row: 16, column: 48 }}
        placements={[
          ['ir', null],
          ['resolve', 'resolution'],
          ['layout', 'geometry'],
          ['emit', 'primitives'],
        ]}
      >
        <FlowEntities
          items={[
            { id: 'ir', text: 'Node IR', role: 'state', layout: { width: 160 } },
            {
              id: 'resolve',
              text: 'resolveNode',
              role: 'activity',
              kind: 'docs.logic.important',
              layout: { width: 160 },
            },
            {
              id: 'resolution',
              text: text.resolution,
              role: 'state',
              kind: 'docs.logic.importantData',
              layout: { width: 240 },
            },
            {
              id: 'layout',
              text: 'compileNodeResolution',
              role: 'activity',
              kind: 'docs.logic.important',
              layout: { width: 160 },
            },
            {
              id: 'geometry',
              text: text.geometry,
              role: 'state',
              kind: 'docs.logic.importantData',
              layout: { width: 240 },
            },
            {
              id: 'emit',
              text: 'emitNodePrimitives',
              role: 'activity',
              kind: 'docs.logic.important',
              layout: { width: 160 },
            },
            {
              id: 'primitives',
              text: text.primitives,
              role: 'state',
              kind: 'docs.logic.importantData',
              layout: { width: 240 },
            },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'ir', target: 'resolve' },
          { source: 'resolve', target: 'resolution' },
          { source: 'resolve', target: 'layout' },
          { source: 'layout', target: 'geometry' },
          { source: 'layout', target: 'emit' },
          { source: 'emit', target: 'primitives' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default CompilationNode;
