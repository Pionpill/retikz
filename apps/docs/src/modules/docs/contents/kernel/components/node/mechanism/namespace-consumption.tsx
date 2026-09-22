import { Draw, Layout, Node } from '@retikz/react';
import { List, Map } from '@retikz/standard-react/container';
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
      <List
        transforms={[{ kind: 'translate', x: 24, y: 135 }]}
        label={{ text: t.queue, position: 'bottom', opacity: 0.8, font: { size: 12 } }}
        layout={{ width: 192, height: 36, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={[
          {
            id: 'queued',
            content: '[0]  Path(a, b)',
          },
        ]}
      />
      <Map
        transforms={[{ kind: 'translate', x: 440, y: 137 }]}
        label={{ text: t.map, position: 'bottom', opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 60 }, value: { width: 152 } }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
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
      <Draw
        way={[
          'child-0.bottom',
          { label: { text: `1. ${t.enqueue}`, side: 'left', textColor: 'gray', font: { size: 12 } } },
          { verticalTo: 'queued.top' },
        ]}
        arrow="->"
      />
      <Draw
        way={[
          'child-1.bottom',
          [314, 95],
          { label: { text: `2. ${t.register}`, textColor: 'gray', font: { size: 12 } } },
          { horizontalTo: 'map-a-key.top' },
          { verticalTo: 'map-a-key.top' },
        ]}
        arrow="->"
      />
      <Draw way={['child-2.right', [694, 47], '|-', 'map-b.right']} arrow="->" />
      <Draw
        way={[
          'queued.right',
          { label: { text: `3. ${t.flush}`, textColor: 'gray', font: { size: 12 } } },
          { horizontalTo: 'map-a-key.left' },
        ]}
        arrow="->"
      />{' '}
      <Map
        transforms={[{ kind: 'translate', x: 45, y: 269 }]}
        label={{ text: t.immediate, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 90 }, value: { width: 114 } }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
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
      <Node
        id="point"
        position={[585, 285]}
        cornerRadius={8}
        text="[70, 0]"
        style={{ fill: 'dodgerblue', fillOpacity: 0.14, stroke: 'none', font: { size: 13 } }}
      />
      <Draw
        way={[
          'query-id.right',
          { label: { text: t.result, textColor: 'gray', font: { size: 12 } } },
          { horizontalTo: 'point.left' },
        ]}
        arrow="->"
      />
      <Node
        position={[325, 364]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default NamespaceConsumption;
