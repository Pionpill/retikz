import { FlowDiagram, FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { requestFlowI18n } from './request-flow.i18n';

/** 请求流程示例的语言 */
export type RequestFlowProps = { lang?: Lang };

/** 用三个对象和两条关系展示自动排布 */
const RequestFlow: FC<RequestFlowProps> = props => {
  const { lang = 'zh' } = props;
  const t = requestFlowI18n[lang];
  return (
    <FlowDiagram
      presentation={{ title: { text: t.title } }}
      layout={{ direction: 'right' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <FlowEntities
        items={[
          { id: 'request', text: t.request, role: 'activity' },
          { id: 'process', text: t.process, role: 'activity' },
          { id: 'result', text: t.result, role: 'activity' },
        ]}
      />
      <FlowRelations
        items={[
          ['request', 'process'],
          ['process', 'result'],
        ]}
      />
    </FlowDiagram>
  );
};

export default RequestFlow;
