import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityMinimalI18n } from './entity-minimal.i18n';

/** 最小实体示例的语言 */
export type EntityMinimalProps = { lang?: Lang };
/** 用内置活动角色表达一项工作 */
const EntityMinimal: FC<EntityMinimalProps> = props => {
  const { lang = 'zh' } = props;
  return (
    <Graph>
      <Entity id="task" role="activity" position={[180, 90]}>
        {entityMinimalI18n[lang].text}
      </Entity>
    </Graph>
  );
};
export default EntityMinimal;
