import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { nodeSizeStatesI18n } from './node-size-states.i18n';

export type NodeSizeStatesProps = Readonly<{ lang?: Lang }>;

const NodeSizeStates: FC<NodeSizeStatesProps> = props => {
  const { lang } = props;
  const i18n = nodeSizeStatesI18n[lang ?? 'zh'];
  return (
    <Layout>
      {[0, 1, 2].map(stage => (
        <Scope key={stage} transforms={[{ kind: 'translate', x: stage * 165, y: 0 }]}>
          <Node
            position={[0, -55]}
            text={i18n.stages[stage]}
            style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}
          />
          <Node
            position={[0, 0]}
            text="Hello"
            layout={{ padding: stage === 0 ? 0 : 12 }}
            style={{ stroke: stage === 0 ? 'gray' : 'currentColor', fill: 'none', dashed: stage === 0 }}
            label={stage === 2 ? { text: i18n.label, position: 'bottom', distance: 12 } : undefined}
          />
        </Scope>
      ))}
      <Draw
        way={[
          [48, 0],
          [115, 0],
        ]}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
      <Draw
        way={[
          [214, 0],
          [280, 0],
        ]}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
      <Node
        position={[82, 25]}
        text={i18n.padding}
        style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        position={[247, 25]}
        text={i18n.label}
        style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};

export default NodeSizeStates;
