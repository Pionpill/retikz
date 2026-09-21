import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import { List, Map } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathCursorI18n } from './path-cursor.i18n';

/** 游标状态图的语言 */
export type PathCursorProps = { lang?: Lang };

/** 用同一输入对照当前笔位、子路径起点和可见线条 */
const PathCursor: FC<PathCursorProps> = props => {
  const { lang = 'zh' } = props;
  const t = pathCursorI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <List
        label={{ text: t.steps, opacity: 0.8, font: { size: 12 } }}
        data={[
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [120, 0] },
          { kind: 'move', to: [0, 60] },
          { kind: 'line', to: [120, 60] },
          { kind: 'cycle' },
        ]}
        style={{ font: { size: 13 } }}
        layout={{ width: 126 }}
        showIndex
      />
      {t.states.map((title, index) => (
        <Scope key={title} localNamespace transforms={[{ kind: 'translate', x: index * 225, y: 180 }]}>
          <Map
            label={{ text: title, opacity: 0.8, font: { size: 12 } }}
            layout={{ height: 32, key: { width: 110 }, value: { width: 100 } }}
            style={{ font: { size: 13 } }}
            entries={[
              {
                key: { content: t.position },
                value: { content: index === 0 ? 'B [120, 0]' : 'C [0, 60]', style: { fill: 'dodgerblue' } },
              },
              { key: { content: t.start }, value: { content: index === 0 ? 'A [0, 0]' : 'C [0, 60]' } },
            ]}
          />
          <Scope transforms={[{ kind: 'translate', x: 40, y: 110 }]}>
            <Draw
              way={[
                [0, 0],
                [120, 0],
              ]}
            />
            {index === 2 && (
              <Path>
                <Step kind="move" to={[0, 60]} />
                <Step kind="line" to={[120, 60]} />
                <Step kind="cycle" />
              </Path>
            )}
            {(['A', 'B', 'C', 'D'] as const).map((name, pointIndex) => (
              <Node
                key={name}
                position={[(pointIndex % 2) * 120, pointIndex < 2 ? 0 : 60]}
                shape="circle"
                layout={{ minimumSize: 5, padding: 0 }}
                style={{ stroke: 'none', fill: pointIndex === (index === 0 ? 1 : 2) ? 'dodgerblue' : 'gray' }}
                label={{ text: name, position: 'bottom', font: { size: 12 } }}
              />
            ))}
          </Scope>
        </Scope>
      ))}
      <Node position={[325, 410]} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} text={t.note} />
    </Layout>
  );
};
export default PathCursor;
