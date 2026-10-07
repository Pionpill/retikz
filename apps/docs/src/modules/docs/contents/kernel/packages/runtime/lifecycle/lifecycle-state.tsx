import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { lifecycleStateI18n } from './lifecycle-state.i18n';

/** 状态对照图的语言 */
export type LifecycleStateProps = Readonly<{ lang?: Lang }>;

/** 字段摘录对比已发布值、候选值及成功发布后的值 */
const LifecycleState: FC<LifecycleStateProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleStateI18n[lang];
  return (
    <Layout>
      {[
        { title: text.before, x: 0, revision: '0', source: 'A: 1, B: 2', result: 'A: 2, B: 4', display: '2, 4' },
        {
          title: text.candidate,
          x: 290,
          revision: text.pending,
          source: 'A: 3, B: 2',
          result: 'A: 6, B: 4',
          display: '2, 4',
        },
        { title: text.after, x: 580, revision: '1', source: 'A: 3, B: 2', result: 'A: 6, B: 4', display: '6, 4' },
      ].map(state => (
        <Map
          key={state.x}
          transforms={[{ kind: 'translate', x: state.x, y: 0 }]}
          label={{ text: state.title, font: { size: 12 } }}
          layout={{ height: 30, key: { width: 90 }, value: { width: 180 } }}
          style={{ font: { size: 14 } }}
          entries={[
            { key: text.revision, value: state.revision },
            { key: text.source, value: state.source },
            { key: text.result, value: state.result },
            { key: text.display, value: state.display },
            {
              key: { content: text.identity, style: { fill: 'dodgerblue' } },
              value: { content: "graph / ['nodes', 'A']", style: { fill: 'dodgerblue' } },
            },
          ]}
        />
      ))}
    </Layout>
  );
};
export default LifecycleState;
