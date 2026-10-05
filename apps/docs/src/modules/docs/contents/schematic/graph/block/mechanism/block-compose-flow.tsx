import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { blockComposeFlowI18n } from './block-compose-flow.i18n';

/** 内容组合插图的语言 */
export type BlockComposeFlowProps = { lang?: Lang };

/** 展示局部主题与内容组合的先后关系 */
const BlockComposeFlow: FC<BlockComposeFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = blockComposeFlowI18n[lang];

  return (
    <PreviewFlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="block-compose-flow" kind="linear" direction="right">
        <FlowEntities
          items={[
            { id: 'source', role: 'resource', text: text[0] },
            { id: 'resolve', role: 'activity', text: text[1] },
            { id: 'appearance', role: 'activity', text: text[2] },
            { id: 'node', role: 'resource', text: text[3] },
          ]}
        />
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'source', target: 'resolve' },
          { source: 'resolve', target: 'appearance' },
          { source: 'appearance', target: 'node' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default BlockComposeFlow;
