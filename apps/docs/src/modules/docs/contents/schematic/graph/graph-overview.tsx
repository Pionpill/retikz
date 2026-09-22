import { Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { graphOverviewI18n } from './graph-overview.i18n';

/** Graph 总览示意图的语言参数 */
export type GraphOverviewProps = { lang?: Lang };

/** 用两个对象和一条关系说明 Graph 组件的基本协作 */
const GraphOverview: FC<GraphOverviewProps> = props => {
  const { lang = 'zh' } = props;
  const text = graphOverviewI18n[lang];

  return (
    <Graph viewBox={{ x: 0, y: 0, width: 440, height: 160 }}>
      <Entity id="client" role="participant" position={[96, 80]}>
        {text.client}
      </Entity>
      <Entity id="service" role="activity" position={[344, 80]}>
        {text.service}
      </Entity>
      <Relation
        id="request"
        role="flow"
        source={{ id: 'client' }}
        target={{ id: 'service' }}
        way={['client', 'service']}
      />
    </Graph>
  );
};

export default GraphOverview;
