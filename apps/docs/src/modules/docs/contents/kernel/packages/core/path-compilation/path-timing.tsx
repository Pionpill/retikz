import { Layout, Node, Scope } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathTimingI18n } from './path-timing.i18n';

/** Path 数据快照图的语言 */
export type PathTimingProps = { lang?: Lang };

/** 跟踪同一 Path 记录、命名空间和图元数组的变化 */
const PathTiming: FC<PathTimingProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathTimingI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.stages.map((title, i) => (
        <Scope key={title} localNamespace position={[i * 260, 0]}>
          <Node position={[113, 290]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          {i === 1 && (
            <Scope position={[0, 0]}>
              <Map
                label={{ text: text.record, position: 'top', font: { size: 12 }, textColor: 'gray' }}
                entries={[
                  { key: 'path', value: 'P: A → B' },
                  { key: 'scopeChain', value: '[T]' },
                  { key: 'placeholderSlot', value: 'slot P' },
                ]}
                defaultCell={{
                  style: { font: { size: 13 } },
                  layout: { height: 28 },
                  key: { layout: { width: 132 } },
                  value: { layout: { width: 92 } },
                }}
              />
            </Scope>
          )}
          <Scope position={[0, 136]}>
            <Map
              label={{ text: text.namespace, position: 'top', font: { size: 12 }, textColor: 'gray' }}
              entries={[
                { key: 'A', value: 'resolved · [0, 0]' },
                ...(i > 0
                  ? [
                      {
                        key: 'B',
                        value: {
                          content: 'resolved · [120, 0]',
                          style: { fill: 'dodgerblue', opacity: { fill: 0.18 } },
                        },
                      },
                    ]
                  : []),
              ]}
              defaultCell={{
                style: { font: { size: 13 } },
                layout: { height: 28 },
                key: { layout: { width: 38 } },
                value: { layout: { width: 186 } },
              }}
            />
          </Scope>
          <Scope position={[0, 229]}>
            <Array
              label={{ text: text.sink, position: 'top', font: { size: 12 }, textColor: 'gray' }}
              items={[
                'A',
                {
                  content: i === 2 ? 'Path P' : 'slot P',
                  style: { fill: i === 2 ? 'dodgerblue' : 'darkorange', opacity: { fill: 0.2 } },
                },
                ...(i > 0 ? ['B'] : []),
              ]}
              index
              defaultCell={{ layout: { width: 74, height: 28 }, style: { font: { size: 13 } } }}
            />
          </Scope>
        </Scope>
      ))}
    </Layout>
  );
};
export default PathTiming;
