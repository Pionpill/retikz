import { defineEntityKind } from '@retikz/graph';
import type { IRGraphRule } from '@retikz/graph';
import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityKindsI18n } from './entity-kinds.i18n';

const kinds = ['docs.task.routine', 'docs.task.priority', 'docs.task.blocked'] as const;
const entityKinds = kinds.map(kind => defineEntityKind({ role: 'activity', kind, description: kind }));
const graphRules: Array<IRGraphRule> = [
  {
    type: 'entity',
    selector: { role: 'activity', kind: 'docs.task.priority' },
    style: { color: '#2563eb', strokeWidth: 2 },
  },
  {
    type: 'entity',
    selector: { role: 'activity', kind: 'docs.task.blocked' },
    style: { color: '#dc2626', dashPattern: [6, 4] },
  },
];

/** 自定义 kind 平铺示例的语言 */
export type EntityKindsProps = { lang?: Lang };

/** 固定 activity 结构，对比无规则与匹配作者规则的子类型 */
const EntityKinds: FC<EntityKindsProps> = props => {
  const { lang = 'zh' } = props;
  return (
    <Graph entityKinds={entityKinds} graphRules={graphRules}>
      {kinds.map((kind, index) => (
        <Entity key={kind} role="activity" kind={kind} position={[210 + index * 170, 65]}>
          {entityKindsI18n[lang][index]}
        </Entity>
      ))}
    </Graph>
  );
};

export default EntityKinds;
