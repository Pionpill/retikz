import { Entity, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityGroupsI18n } from './entity-groups.i18n';

const groups: ReadonlyArray<{ key: string; positions: ReadonlyArray<[number, number]> }> = [
  {
    key: 'planning',
    positions: [
      [265, 65],
      [435, 65],
    ],
  },
  {
    key: 'delivery',
    positions: [
      [180, 140],
      [350, 140],
      [520, 140],
    ],
  },
  {
    key: 'support',
    positions: [
      [95, 215],
      [265, 215],
      [435, 215],
      [605, 215],
    ],
  },
];

/** 实体分组示例的语言 */
export type EntityGroupsProps = { lang?: Lang };

/** 三个语义组分别容纳两个、三个和四个实体 */
const EntityGroups: FC<EntityGroupsProps> = props => {
  const { lang = 'zh' } = props;
  return (
    <Graph>
      {groups.flatMap((group, groupIndex) =>
        group.positions.map((position, entityIndex) => (
          <Entity key={`${group.key}-${entityIndex}`} role="activity" group={group.key} position={position}>
            {entityGroupsI18n[lang][groupIndex][entityIndex]}
          </Entity>
        )),
      )}
    </Graph>
  );
};

export default EntityGroups;
