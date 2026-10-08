import { Entity, Graph, Group, Relation } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { groupNestedI18n } from './group-nested.i18n';

/** 嵌套分组示例语言 */
export type GroupNestedProps = { lang?: Lang };

/** 两个实例复用局部名称，关系留在各自命名空间 */
const GroupNested: FC<GroupNestedProps> = props => {
  const { lang = 'zh' } = props;
  const text = groupNestedI18n[lang];

  return (
    <Graph>
      {text.regions.map((region, index) => (
        <Group
          key={region}
          id={`region-${index}`}
          localNamespace
          caption={{ title: { text: region } }}
          position={[index * 340, 0]}
        >
          <Group id="workers" caption={{ title: { text: text.workers } }}>
            <Entity id="input" role="resource" position={[0, 0]}>
              {text.input}
            </Entity>
            <Entity id="task" role="activity" position={[150, 0]}>
              {text.task}
            </Entity>
            <Relation role="flow" source="input" target="task" />
          </Group>
        </Group>
      ))}
    </Graph>
  );
};
export default GroupNested;
