import { Entity, Graph, Group, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { groupBasicI18n } from './group-basic.i18n';
/** 最小分组示例的语言 */
export type GroupMinimalProps = { lang?: Lang };
/** 保留子节点位置，以外框表达包含关系 */
const GroupMinimal: FC<GroupMinimalProps> = props => {
  const { lang = 'zh' } = props;
  const text = groupBasicI18n[lang];
  return (
    <Graph>
      <Group id="runtime">
        <Entity id="compiler" role="activity" position={[80, 60]}>
          {text.compiler}
        </Entity>
        <Entity id="renderer" role="participant" position={[240, 60]}>
          {text.renderer}
        </Entity>
        <Relation role="flow" source="compiler" target="renderer" />
      </Group>
    </Graph>
  );
};
export default GroupMinimal;
