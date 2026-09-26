import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityRolesI18n } from './entity-roles.i18n';

const roles = ['participant', 'activity', 'event', 'state', 'gateway', 'resource', 'concept'] as const;
const positions: ReadonlyArray<[number, number]> = [
  [125, 65],
  [275, 65],
  [425, 65],
  [575, 65],
  [200, 145],
  [350, 145],
  [500, 145],
];

/** 内置角色平铺示例的语言 */
export type EntityRolesProps = { lang?: Lang };

/** 相同外观下对比七种内置 role 的结构 */
const EntityRoles: FC<EntityRolesProps> = props => {
  const { lang = 'zh' } = props;
  return (
    <Graph>
      {roles.map((role, index) => (
        <Entity key={role} role={role} position={positions[index]}>
          {entityRolesI18n[lang][index]}
        </Entity>
      ))}
    </Graph>
  );
};

export default EntityRoles;
