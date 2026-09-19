import { Draw, Layout, Node } from '@retikz/react';
import { List } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceConsumptionI18n } from './namespace-consumption.i18n';
import { NamespaceCaption, NamespaceTable } from './NamespaceDiagramParts';

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
        layout={{ cellSize: { width: 192, height: 36 }, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={['Path(a, b)', 'Node a', 'Node b'].map((text, index) => ({ id: `child-${index}`, content: <Node position={[0, 0]} text={`[${index}]  ${text}`} style={{ fill: 'none', stroke: 'none' }} layout={{ padding: 0, margin: 0 }} /> }))}
      />
      <NamespaceCaption position={[120, 133]} text={t.queue} />
      <List
        transforms={[{ kind: 'translate', x: 24, y: 154 }]}
        layout={{ cellSize: { width: 192, height: 36 }, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={[{ id: 'queued', content: <Node position={[0, 0]} text="[0]  Path(a, b)" style={{ fill: 'none', stroke: 'none' }} layout={{ padding: 0, margin: 0 }} /> }]}
      />
      <NamespaceTable
        position={[377, 166]}
        title={t.map}
        rows={[
          { id: 'map-a', key: 'a', value: '{ layout, state }', active: true },
          { id: 'map-b', key: 'b', value: '{ layout, state }' },
        ]}
      />
      <Draw way={['child-0.left', [0, 47], [0, 172], 'queued.left']} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[210, 89]} text={t.enqueue} secondary />
      <Draw way={['child-1.bottom', [314, 166], 'map-a-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['child-2.bottom', [634, 65], [634, 200], 'map-b.right']} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[498, 95]} text={t.register} secondary />
      <Draw
        way={['queued.bottom', [120, 238], [344, 238], [344, 166], 'map-a-key.left']}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
      <NamespaceCaption position={[204, 261]} text={t.flush} secondary />
      <NamespaceCaption position={[325, 292]} text={t.immediate} />
      <NamespaceTable
        position={[45, 330]}
        title=""
        keyWidth={92}
        valueWidth={116}
        rows={[
          { id: 'query-id', key: 'id', value: "'a'", active: true },
          { id: 'query-anchor', key: 'anchor', value: "'right'" },
        ]}
      />
      <Node
        id="point"
        position={[538, 347]}
        text="[70, 0]"
        style={{ fill: 'none', stroke: 'none', font: { size: 16 } }}
      />
      <Draw way={['query-id.right', [310, 330], [310, 347], 'point.left']} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[395, 314]} text={t.result} secondary />
      <NamespaceCaption position={[325, 409]} text={t.note} secondary />
    </Layout>
  );
};
export default NamespaceConsumption;
