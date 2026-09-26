import type { GraphStatusValue } from '@retikz/graph';
import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityStatusesI18n } from './entity-statuses.i18n';

const statuses: ReadonlyArray<GraphStatusValue | undefined> = [undefined, 'error', 'success', 'warning', 'disabled'];

/** 内置状态平铺示例的语言 */
export type EntityStatusesProps = { lang?: Lang };

/** 固定 activity 结构，对比五种状态的主题外观 */
const EntityStatuses: FC<EntityStatusesProps> = props => {
  const { lang = 'zh' } = props;
  return (
    <Graph>
      {statuses.map((status, index) => (
        <Entity key={status ?? 'default'} role="activity" status={status} position={[120 + index * 130, 65]}>
          {entityStatusesI18n[lang][index]}
        </Entity>
      ))}
    </Graph>
  );
};

export default EntityStatuses;
