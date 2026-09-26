import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';

import { entityFlowI18n } from './entity-flow.i18n';
/** 实体链路插图的语言 */
export type EntityFlowProps = { lang?: Lang };
/** 仅展示 Entity 自身的处理阶段，不重复全局编译管线 */
const EntityFlow: FC<EntityFlowProps> = props => {
  const { lang = 'zh' } = props;
  const text = entityFlowI18n[lang];
  return (
    <PreviewFlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="entity-flow" kind="linear" direction="right">
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
export default EntityFlow;
