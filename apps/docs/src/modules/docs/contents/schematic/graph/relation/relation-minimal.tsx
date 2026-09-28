import { Entity, Graph, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { relationMinimalI18n } from './relation-minimal.i18n';
/** 最小关系示例的语言 */
export type RelationMinimalProps = { lang?: Lang };
/** 两个命名对象之间的流动 */
const RelationMinimal: FC<RelationMinimalProps> = props => {
  const { lang = 'zh' } = props;
  const text = relationMinimalI18n[lang];
  return (
    <Graph>
      <Entity id="sender" role="activity" position={[80, 80]}>
        {text.source}
      </Entity>
      <Entity id="receiver" role="activity" position={[320, 80]}>
        {text.target}
      </Entity>
      <Relation role="flow" source="sender" target="receiver" />
    </Graph>
  );
};
export default RelationMinimal;
