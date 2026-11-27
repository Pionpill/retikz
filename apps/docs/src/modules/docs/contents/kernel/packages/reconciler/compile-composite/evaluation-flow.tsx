import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { evaluationFlowI18n } from './evaluation-flow.i18n';

/** 逐帧比较同一子项的宽度、候选几何、待提交位移和正式位置 */
const EvaluationFlow: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
  const { titles, captions } = evaluationFlowI18n[lang];
  const label = { stroke: 'none', fill: 'none', font: { size: 13 } };
  const guide = { stroke: 'gray', dashPattern: [2, 3] };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {titles.map((title, index) => (
        <Scope key={title} transforms={[{ kind: 'translate', x: index * 180, y: 0 }]}>
          <Node position={[0, -48]} style={label}>
            {title}
          </Node>
          <Draw
            way={[
              [-58, 0],
              [66, 0],
            ]}
            style={guide}
          />
          <Draw
            way={[
              [-25, -24],
              [-25, 26],
            ]}
            style={guide}
          />
          {index < 3 && (
            <Node
              position={[-25, 0]}
              layout={{ width: 30, minimumSize: { height: 20 }, padding: 0 }}
              style={{ stroke: 'gray', fill: 'none', dashPattern: [4, 2] }}
            >
              A
            </Node>
          )}
          {index === 0 && (
            <>
              <Draw
                way={[
                  [-40, 16],
                  [-40, 23],
                  [-10, 23],
                  [-10, 16],
                ]}
              />
              <Node position={[-25, 35]} style={label}>
                60
              </Node>
            </>
          )}
          {index === 2 && (
            <Draw
              way={[
                [-25, -15],
                [25, -15],
              ]}
              arrow="->"
              style={{ stroke: 'darkorange' }}
            />
          )}
          {index >= 2 && (
            <Node
              position={[25, 0]}
              layout={{ width: 30, minimumSize: { height: 20 }, padding: 0 }}
              style={
                index === 2
                  ? { stroke: 'darkorange', fill: 'none', dashPattern: [3, 3] }
                  : { stroke: 'dodgerblue', fill: 'dodgerblue', opacity: { fill: 0.15 } }
              }
            >
              A
            </Node>
          )}
          <Node position={[0, 58]} style={label}>
            {captions[index]}
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};
export default EvaluationFlow;
