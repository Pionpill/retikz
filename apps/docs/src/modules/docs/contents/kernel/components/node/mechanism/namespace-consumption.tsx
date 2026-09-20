import { Draw, Layout, Node, Scope } from '@retikz/react';
import { List, Map } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceConsumptionI18n } from './namespace-consumption.i18n';

/** 引用时序图的语言 */
export type NamespaceConsumptionProps = { lang?: Lang };

/** 同一声明数组中的立即登记与路径延迟消费 */
const NamespaceConsumption: FC<NamespaceConsumptionProps> = props => {
  const { lang = 'zh' } = props;
  const t = namespaceConsumptionI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <List
        transforms={[{ kind: 'translate', x: 24, y: 29 }]}
        layout={{ width: 192, height: 36, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={['Path(a, b)', 'Node a', 'Node b'].map((text, index) => ({
          id: `child-${index}`,
          content: `[${index}]  ${text}`,
        }))}
      />
      <Node
        position={[120, 133]}
        text={t.queue}
        style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
      />
      <List
        transforms={[{ kind: 'translate', x: 24, y: 154 }]}
        layout={{ width: 192, height: 36, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={[
          {
            id: 'queued',
            content: '[0]  Path(a, b)',
          },
        ]}
      />
      <Scope transforms={[{ kind: 'translate', x: 377, y: 166 }]}>
        <Node
          position={[108, -30]}
          text={t.map}
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 60 }, value: { width: 152 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'map-a-key', content: 'a', style: { fill: 'dodgerblue' } },
              value: { id: 'map-a', content: '{ layout, state }', style: { fill: 'dodgerblue' } },
            },
            {
              key: { id: 'map-b-key', content: 'b' },
              value: { id: 'map-b', content: '{ layout, state }' },
            },
          ]}
        />
      </Scope>
      <Draw way={['child-0.left', [0, 47], [0, 172], 'queued.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[210, 89]}
        text={t.enqueue}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Draw way={['child-1.bottom', [314, 166], 'map-a-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['child-2.bottom', [634, 65], [634, 200], 'map-b.right']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[498, 95]}
        text={t.register}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Draw
        way={['queued.bottom', [120, 238], [344, 238], [344, 166], 'map-a-key.left']}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
      <Node
        position={[204, 261]}
        text={t.flush}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        position={[325, 292]}
        text={t.immediate}
        style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
      />
      <Scope transforms={[{ kind: 'translate', x: 45, y: 330 }]}>
        <Node
          position={[104, -30]}
          text=""
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 90 }, value: { width: 114 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'query-id-key', content: 'id', style: { fill: 'dodgerblue' } },
              value: { id: 'query-id', content: "'a'", style: { fill: 'dodgerblue' } },
            },
            {
              key: { id: 'query-anchor-key', content: 'anchor' },
              value: { id: 'query-anchor', content: "'right'" },
            },
          ]}
        />
      </Scope>
      <Node
        id="point"
        position={[538, 347]}
        text="[70, 0]"
        style={{ fill: 'none', stroke: 'none', font: { size: 16 } }}
      />
      <Draw way={['query-id.right', [310, 330], [310, 347], 'point.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[395, 314]}
        text={t.result}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        position={[325, 409]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default NamespaceConsumption;
