import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { textContrastFlowI18n } from './text-contrast-flow.i18n';

export type TextContrastFlowProps = Readonly<{ lang?: Lang }>;
const TextContrastFlow: FC<TextContrastFlowProps> = props => {
  const { lang } = props;
  const labels = textContrastFlowI18n[lang ?? 'zh'];
  return (
    <PreviewFlowDiagram
      {...logicFigureGraphProps()}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowLayout
        id="text-contrast-flow"
        kind="grid"
        columnGap={24}
        rowGap={30}
        placements={[
          ['n0', 'n1', 'n2'],
          [null, null, 'n3'],
        ]}
      >
        <FlowEntities items={labels.map((text, index) => ({ id: `n${index}`, text, role: 'activity' }))} />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'n0', target: 'n1' },
          { source: 'n1', target: 'n2' },
          { source: 'n1', target: 'n3' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default TextContrastFlow;
