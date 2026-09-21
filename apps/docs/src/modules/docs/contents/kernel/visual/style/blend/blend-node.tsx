import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { blendNodeI18n } from './blend-node.i18n';

/** Node 示例的语言参数 */
export type BlendNodeProps = { lang?: Lang };
/** Compare primary-shape blending while keeping text and labels independent */
const BlendNode: FC<BlendNodeProps> = props => {
  const { lang = 'zh' } = props;
  const text = blendNodeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {(['normal', 'multiply'] as const).map((mode, index) => (
        <Scope key={mode}>
          <Node position={[index * 240, -86]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {mode}
          </Node>
          <Node
            position={[index * 240 - 20, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 120, height: 90 } }}
            style={{ fill: 'darkorange', stroke: 'none' }}
          />
          <Node
            position={[index * 240 + 24, 16]}
            shape="rectangle"
            label={{ text: text.label, position: 'top' }}
            layout={{ minimumSize: { width: 100, height: 64 } }}
            style={{ fill: 'dodgerblue', stroke: 'none', blendMode: mode }}
          >
            Node
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};
export default BlendNode;
