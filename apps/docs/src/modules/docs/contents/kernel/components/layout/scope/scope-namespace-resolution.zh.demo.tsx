import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Scope 命名空间 lookup、注册与重复 id 处理图 */
const Demo: FC = () => (
  <Layout width={640} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="lookup"
      position={[-165, -105]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      lookup(id)
    </Node>
    <Node
      id="current-frame"
      position={[-165, -55]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      1 · 当前 frame
    </Node>
    <Node
      id="parent-frame"
      position={[-165, -5]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      2 · 父 frame
    </Node>
    <Node
      id="root-frame"
      position={[-165, 45]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      3 · 根 frame
    </Node>
    <Node
      id="lookup-result"
      position={[-165, 100]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      首个命中
    </Node>

    <Node
      id="register"
      position={[165, -105]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      register(id)
    </Node>
    <Node
      id="new-id"
      position={[65, -25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      当前 frame 新 id
    </Node>
    <Node
      id="duplicate-id"
      position={[265, -25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      当前 frame 重复 id
    </Node>
    <Node
      id="write"
      position={[65, 70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      写入当前 frame
    </Node>
    <Node
      id="last-wins"
      position={[265, 70]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      warn + last-wins
    </Node>

    <Draw way={['lookup', 'current-frame']} arrow="->" />
    <Draw way={['current-frame', 'parent-frame']} arrow="->" />
    <Draw way={['parent-frame', 'root-frame']} arrow="->" />
    <Draw way={['root-frame', 'lookup-result']} arrow="->" />
    <Draw way={['register', 'new-id']} arrow="->" />
    <Draw way={['register', 'duplicate-id']} arrow="->" />
    <Draw way={['new-id', 'write']} arrow="->" />
    <Draw way={['duplicate-id', 'last-wins']} arrow="->" stroke="red" />
  </Layout>
);

export default Demo;
