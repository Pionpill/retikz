import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Owner candidate 只有通过完整状态比较与校验后才能替换 current */
const Demo: FC = () => (
  <Layout width={520} height={420} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="complete-input"
      text={[
        { text: 'Complete input', font: { weight: 'bold' } },
        { text: 'domain-owned', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, -150]}
      minimumSize={{ width: 120, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="capture"
      text={[
        { text: 'capture', font: { weight: 'bold' } },
        { text: 'take ownership', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, -85]}
      minimumSize={{ width: 104, height: 46 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="candidate"
      text={[
        { text: 'Candidate value', font: { weight: 'bold' } },
        { text: 'session-owned', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, -20]}
      minimumSize={{ width: 126, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="verify"
      text={[
        { text: 'read · equals', font: { weight: 'bold' } },
        { text: 'collect · validate', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, 45]}
      minimumSize={{ width: 136, height: 48 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="publish"
      text={[
        { text: 'publish', font: { weight: 'bold' } },
        { text: 'pointer swap', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, 110]}
      minimumSize={{ width: 108, height: 46 }}
      stroke="green"
      fill="green"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="current"
      text={[
        { text: 'Current value', font: { weight: 'bold' } },
        { text: 'complete Snapshot', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-170, 45]}
      minimumSize={{ width: 136, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="retire-candidate"
      text={[
        { text: 'Retire candidate', font: { weight: 'bold' } },
        { text: 'dispose exactly once', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-170, 140]}
      minimumSize={{ width: 144, height: 46 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="retire-previous"
      text={[
        { text: 'Retire previous', font: { weight: 'bold' } },
        { text: 'dispose exactly once', fill: 'gray', font: { size: 11 } },
      ]}
      position={[170, 140]}
      minimumSize={{ width: 144, height: 46 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Draw way={['complete-input', 'capture']} arrow="->" stroke="gray" />
    <Draw way={['capture', 'candidate']} arrow="->" stroke="gray" />
    <Draw way={['candidate', 'verify']} arrow="->" stroke="gray" />
    <Draw way={['verify', 'publish']} arrow="->" stroke="green" />
    <Draw way={['current', 'verify']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['verify', 'retire-candidate']} arrow="->" stroke="red" dashPattern={[4, 3]} />
    <Draw way={['publish', 'retire-previous']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
