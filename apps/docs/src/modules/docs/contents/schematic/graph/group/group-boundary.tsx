import { Entity, Graph, Group } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { groupBoundaryI18n } from './group-boundary.i18n';

/** 边界对比插图语言 */
export type GroupBoundaryProps = { lang?: Lang };
/** 比较内部说明和外部标签如何影响外框 */
const GroupBoundary: FC<GroupBoundaryProps> = props => {
  const { lang = 'zh' } = props;
  const text = groupBoundaryI18n[lang];
  return (
    <Graph>
      <Group id="caption" caption={{ title: { text: text.caption } }}>
        <Entity role="activity" position={[0, 0]}>
          {text.body}
        </Entity>
      </Group>
      <Group id="label" transforms={[{ kind: 'translate', x: 300, y: 0 }]} labels={[{ text: text.label }]}>
        <Entity role="activity" position={[0, 0]}>
          {text.body}
        </Entity>
      </Group>
    </Graph>
  );
};
export default GroupBoundary;
