import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compositeProbeI18n } from './composite-probe.i18n';

/** 隔离试算图的语言 */
export type CompositeProbeProps = { lang?: Lang };
/** 展示回调结果、会话事务和未受试算影响的父输出 */
const CompositeProbe: FC<CompositeProbeProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositeProbeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {t.results.map((label, i) => (
        <Scope key={label} position={[0, i * 145]}>
          <Map
            label={{ text: label, position: 'top', opacity: 0.8, font: { size: 12 } }}
            entries={[
              { key: 'slotSize', value: i === 0 ? '100 × 0' : '60 × 0' },
              { key: 'allocationBounds', value: '(0, 0, 100, 0)' },
              { key: 'replay', value: { id: `result${i}`, content: `T${i}`, style: { fill: 'dodgerblue' } } },
            ]}
            defaultCell={{
              layout: { height: 30 },
              style: { font: { size: 12 } },
              key: { layout: { width: 145 } },
              value: { layout: { width: 130 } },
            }}
          />
        </Scope>
      ))}
      <Map
        position={[355, 0]}
        label={{ text: t.transactions, position: 'top', opacity: 0.8, font: { size: 12 } }}
        entries={[0, 1].map(i => ({
          key: { id: `token${i}`, content: `T${i}`, style: { fill: 'dodgerblue' } },
          value: { id: `transaction${i}`, content: `{ … }` },
        }))}
        defaultCell={{
          layout: { height: 30 },
          style: { font: { size: 12 } },
          key: { layout: { width: 55 } },
          value: { layout: { width: 220 } },
        }}
      />
      <Map
        id="detail"
        position={[355, 145]}
        label={{ text: t.detail, position: 'top', opacity: 0.8, font: { size: 12 } }}
        entries={[
          { key: 'primitives', value: '[PathPrim]' },
          { key: 'namespaceChanges', value: '[]' },
          { key: 'resources', value: '[]' },
          { key: 'used', value: 'false' },
        ]}
        defaultCell={{
          layout: { height: 30 },
          style: { font: { size: 12 } },
          key: { layout: { width: 145 } },
          value: { layout: { width: 130 } },
        }}
      />
      {[0, 1].map(i => (
        <Draw key={i} way={[`result${i}.right`, `token${i}.left`]} arrow="->" />
      ))}
      <Draw
        way={['transaction1.right', { id: 'transaction1', anchor: 'right', offset: [28, 0] }, '|-', 'detail.right']}
        arrow="->"
      />
      <Array
        position={[0, 295]}
        items={['…']}
        label={{ text: t.parent, position: 'top', opacity: 0.8, font: { size: 12 } }}
        defaultCell={{ layout: { width: 275, height: 28 }, style: { font: { size: 12 } } }}
      />
      <Node position={[315, 350]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {t.note}
      </Node>
    </Layout>
  );
};
export default CompositeProbe;
