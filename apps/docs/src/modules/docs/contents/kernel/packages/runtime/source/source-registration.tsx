import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { sourceRegistrationI18n } from './source-registration.i18n';

/** 主题关系图的语言配置 */
export type SourceRegistrationProps = Readonly<{ lang?: Lang }>;
/** 展示本主题的输入、处理规则与读取用途 */
const SourceRegistration: FC<SourceRegistrationProps> = props => {
  const { lang = 'zh' } = props;
  const text = sourceRegistrationI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="source-registration" kind="linear" direction="right" align="center">
        <FlowLayout id="column-0" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'definition', text: text.definition, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'registry', text: text.registry, role: 'resource' }]} />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'find', text: text.find, role: 'activity' },
              { id: 'resolve', text: text.resolve, role: 'activity' },
              { id: 'list', text: text.list, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'definition', target: 'registry' },
          { source: 'registry', target: 'find' },
          { source: 'registry', target: 'resolve' },
          { source: 'registry', target: 'list' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default SourceRegistration;
