import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { computationPropagationI18n } from './computation-propagation.i18n';

/** 依赖传播图的语言配置 */
export type ComputationPropagationProps = Readonly<{ lang?: Lang }>;

/** 对比新结果传播、bailout 截断与多上游汇合；箭头始终表示真实依赖 */
const ComputationPropagation: FC<ComputationPropagationProps> = props => {
  const { lang = 'zh' } = props;
  const text = computationPropagationI18n[lang];
  const colors = { updated: 'dodgerblue', bailout: 'darkorange', skipped: 'gray' } as const;
  const nodes = [
    { id: 'chain-a', text: 'A', x: 250, y: 60, state: 'updated' },
    { id: 'chain-b', text: 'B', x: 390, y: 60, state: 'updated' },
    { id: 'chain-c', text: 'C', x: 530, y: 60, state: 'updated' },
    { id: 'stop-a', text: 'A', x: 250, y: 125, state: 'bailout' },
    { id: 'stop-b', text: 'B', x: 390, y: 125, state: 'skipped' },
    { id: 'stop-c', text: 'C', x: 530, y: 125, state: 'skipped' },
    { id: 'merge-a', text: 'A', x: 250, y: 190, state: 'bailout' },
    { id: 'merge-d', text: 'D', x: 250, y: 250, state: 'updated' },
    { id: 'merge-b', text: 'B', x: 390, y: 220, state: 'updated' },
    { id: 'merge-c', text: 'C', x: 530, y: 220, state: 'updated' },
  ] as const;
  return (
    <Layout>
      {(['updated', 'bailout', 'skipped'] as const).map((state, index) => (
        <Node
          key={state}
          position={[index * 200 + 90, 0]}
          text={text[state]}
          style={{ stroke: colors[state], fill: colors[state], fillOpacity: 0.12, font: { size: 12 } }}
          cornerRadius={4}
          layout={{ padding: 6 }}
        />
      ))}
      {[
        { label: text.chain, y: 60 },
        { label: text.stopped, y: 125 },
        { label: text.alternate, y: 220 },
      ].map(row => (
        <Node
          key={row.y}
          position={[90, row.y]}
          text={row.label}
          style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}
        />
      ))}
      {nodes.map(node => (
        <Node
          key={node.id}
          id={node.id}
          position={[node.x, node.y]}
          text={node.text}
          shape="circle"
          layout={{ minimumSize: { width: 36, height: 36 } }}
          style={{ stroke: colors[node.state], fill: colors[node.state], fillOpacity: 0.15, font: { size: 14 } }}
        />
      ))}
      {[
        ['chain-a', 'chain-b'],
        ['chain-b', 'chain-c'],
        ['stop-a', 'stop-b'],
        ['stop-b', 'stop-c'],
        ['merge-a', 'merge-b'],
        ['merge-d', 'merge-b'],
        ['merge-b', 'merge-c'],
      ].map(([from, to]) => (
        <Draw key={`${from}-${to}`} way={[from, to]} arrow="->" />
      ))}
    </Layout>
  );
};

export default ComputationPropagation;
