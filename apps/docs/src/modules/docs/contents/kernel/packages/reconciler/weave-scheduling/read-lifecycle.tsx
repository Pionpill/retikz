import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { readLifecycleI18n } from './read-lifecycle.i18n';

/** 保持节点中心和路径终点固定，对照索引通知前后的边界路径 */
const ReadLifecycle: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
  const t = readLifecycleI18n[lang];
  const note = { textColor: 'gray', font: { size: 12 } };
  const stages = [
    { title: t.before, size: 40, start: 20, field: 'P.referenceReads', detail: t.read },
    { title: t.changed, size: 80, start: 20, field: 'A.consumers', detail: t.find },
    { title: t.after, size: 80, start: 40, field: 'P.dependencies.get(A)', detail: t.compare },
  ];
  return (
    <Layout
      style={{ maxWidth: '100%', height: 'auto' }}
      rootScope={{ defaults: { node: { style: { stroke: 'none', fill: 'none' } } } }}
    >
      {stages.map((stage, index) => (
        <Scope key={stage.field} position={[index * 225, 0]}>
          <Node position={[28, -62]} style={{ font: { size: 14 } }}>
            {stage.title}
          </Node>
          <Node
            position={[0, 0]}
            shape="rectangle"
            layout={{ minimumSize: stage.size, padding: 0 }}
            style={{ stroke: 'dodgerblue', fill: 'dodgerblue', opacity: { fill: 0.08 }, font: { size: 12 } }}
          >
            A
          </Node>
          <Draw
            way={[
              [stage.start, 0],
              [100, 0],
            ]}
            style={index === 1 ? { stroke: 'gray', dashPattern: [4, 3] } : {}}
          />
          <Circle center={[stage.start, 0]} radius={3.5} style={{ fill: 'darkorange', stroke: 'none' }} />
          <Node position={[80, -13]} style={note}>
            P
          </Node>
          <Node position={[28, 59]} style={{ font: { size: 13 } }}>
            {stage.field}
          </Node>
          <Node position={[28, 79]} style={note}>
            {stage.detail}
          </Node>
          {index < 2 && (
            <Draw
              way={[
                [119, 0],
                [167, 0],
              ]}
              arrow="->"
              style={{ stroke: 'gray' }}
            />
          )}
          {index < 2 && (
            <Node position={[143, -15]} style={note}>
              {index === 0 ? t.resize : t.refresh}
            </Node>
          )}
        </Scope>
      ))}
      <Node position={[253, 110]} style={note}>
        {t.legend}
      </Node>
    </Layout>
  );
};
export default ReadLifecycle;
