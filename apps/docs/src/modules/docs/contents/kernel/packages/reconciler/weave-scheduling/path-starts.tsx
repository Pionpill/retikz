import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathStartsI18n } from './path-starts.i18n';

/** 用同一条水平路径对照节点中心读取和隐式边界读取 */
const PathStarts: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => (
  <Layout
    style={{ maxWidth: '100%', height: 'auto' }}
    rootScope={{ defaults: { node: { style: { stroke: 'none', fill: 'none' } } } }}
  >
    {(['center', 'boundary'] as const).map((read, index) => (
      <Scope key={read} position={[index * 224, 0]}>
        <Node position={[32, -64]}>{pathStartsI18n[lang][read]}</Node>
        <Node
          id="a"
          shape="rectangle"
          position={[0, 0]}
          layout={{ minimumSize: 80 }}
          style={{ stroke: 'gray', fill: 'gray', opacity: { fill: 0.08 } }}
        />
        <Node position={[-24, -24]} style={{ font: { size: 13 } }}>
          A
        </Node>
        <Draw way={[read === 'center' ? 'a.center' : 'a', [100, 0]]} arrow="->" />
        <Node
          shape="circle"
          position={[read === 'center' ? 0 : 40, 0]}
          layout={{ minimumSize: 9, padding: 0 }}
          style={{ fill: 'dodgerblue' }}
        />
        <Node position={[100, 18]} style={{ textColor: 'gray', font: { size: 12 } }}>
          [100, 0]
        </Node>
      </Scope>
    ))}
  </Layout>
);
export default PathStarts;
