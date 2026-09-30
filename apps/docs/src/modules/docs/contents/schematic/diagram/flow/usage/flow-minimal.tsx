import { FlowDiagram, FlowEntities, FlowRelations } from '@retikz/diagram-react/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowMinimalI18n } from './flow-minimal.i18n';

/** 最小 Flow 图示的语言参数 */
export type FlowMinimalProps = { lang?: Lang };

/** 展示实体和关系自动排布的最小闭环 */
const FlowMinimal: FC<FlowMinimalProps> = props => {
  const { lang = 'zh' } = props;
  const t = flowMinimalI18n[lang];
  return (
    <FlowDiagram style={{ maxWidth: '100%', height: 'auto' }}>
      <FlowEntities
        items={[
          { id: 'request', text: t.request },
          { id: 'validate', text: t.validate },
          { id: 'store', text: t.store },
        ]}
      />
      <FlowRelations
        items={[
          ['request', 'validate'],
          ['validate', 'store'],
        ]}
      />
    </FlowDiagram>
  );
};

export default FlowMinimal;
