import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { coordinateResolutionFlowI18n } from './coordinate-resolution-flow.i18n';

export type CoordinateResolutionFlowProps = Readonly<{ lang?: Lang }>;
const CoordinateResolutionFlow: FC<CoordinateResolutionFlowProps> = props => {
  const { lang } = props;
  const labels = coordinateResolutionFlowI18n[lang ?? 'zh'];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        id="coordinate-resolution-flow"
        kind="grid"
        columnGap={24}
        rowGap={30}
        placements={[['n0', 'n1', 'n2', 'n3']]}
      >
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
export default CoordinateResolutionFlow;
