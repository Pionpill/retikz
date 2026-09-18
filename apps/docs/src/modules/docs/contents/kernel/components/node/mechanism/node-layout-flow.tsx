import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { nodeLayoutFlowI18n } from './node-layout-flow.i18n';

export type NodeLayoutFlowProps = Readonly<{ lang?: Lang }>;
const NodeLayoutFlow: FC<NodeLayoutFlowProps> = props => {
  const { lang } = props;
  const labels = nodeLayoutFlowI18n[lang ?? 'zh'];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout id="node-layout-flow" kind="grid" columnGap={24} rowGap={30} placements={[['n0', 'n1', 'n2', 'n3']]}>
        <FlowEntities items={labels.map((text, index) => ({ id: `n${index}`, text, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'n0', target: 'n1' },
          { source: 'n1', target: 'n2' },
          { source: 'n2', target: 'n3' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default NodeLayoutFlow;
