import { FlowEntities, FlowLayout, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { logicFigureGraphProps } from '@/modules/docs/components/logic-figure';

import { computationResultI18n } from './computation-result.i18n';

/** 主题关系图的语言配置 */
export type ComputationResultProps = Readonly<{ lang?: Lang }>;
/** 展示本主题的输入、处理规则与读取用途 */
const ComputationResult: FC<ComputationResultProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationResultI18n[lang];
  return (
    <PreviewFlowDiagram {...logicFigureGraphProps()} style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowLayout id="computation-result" kind="linear" direction="right" align="center">
        <FlowLayout id="column-0" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'input', text: text.input, role: 'activity' }]} />
        </FlowLayout>
        <FlowLayout id="column-1" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities items={[{ id: 'owned', text: text.owned, role: 'state' }]} />
        </FlowLayout>
        <FlowLayout id="column-2" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'private', text: text.private, role: 'activity' },
              { id: 'public', text: text.public, role: 'activity' },
            ]}
          />
        </FlowLayout>
        <FlowLayout id="column-3" kind="linear" direction="down" itemWidth="match-largest">
          <FlowEntities
            items={[
              { id: 'next', text: text.next, role: 'activity' },
              { id: 'readers', text: text.readers, role: 'activity' },
            ]}
          />
        </FlowLayout>
      </FlowLayout>
      <FlowRelations
        items={[
          { source: 'input', target: 'owned' },
          { source: 'owned', target: 'private' },
          { source: 'owned', target: 'public' },
          { source: 'private', target: 'next' },
          { source: 'public', target: 'readers' },
        ]}
      />
    </PreviewFlowDiagram>
  );
};
export default ComputationResult;
