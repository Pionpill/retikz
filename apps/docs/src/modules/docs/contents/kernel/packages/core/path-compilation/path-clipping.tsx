import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathClippingI18n } from './path-clipping.i18n';

/** 端点裁剪图的语言 */
export type PathClippingProps = { lang?: Lang };
/** 相同节点布局下对照三种目标点 */
const PathClipping: FC<PathClippingProps> = props => {
  const { lang = 'zh' } = props;
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {pathClippingI18n[lang].map((title, i) => (
        <Scope key={title} localNamespace position={[i * 216, 0]}>
          <Node position={[70, -55]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node id="a" shape="circle" layout={{ minimumSize: 52 }} style={{ fill: 'none', stroke: 'currentColor' }}>
            A
          </Node>
          <Node
            id="b"
            position={[130, 70]}
            shape="circle"
            layout={{ minimumSize: 52 }}
            style={{ fill: 'none', stroke: 'currentColor' }}
          >
            B
          </Node>
          <Draw
            way={
              i === 0
                ? [
                    [0, 0],
                    [130, 70],
                  ]
                : i === 1
                  ? ['a', 'b']
                  : [
                      { id: 'a', anchor: 'right' },
                      { id: 'b', anchor: 'left' },
                    ]
            }
            style={{ stroke: 'dodgerblue', strokeWidth: 2 }}
            arrow="->"
          />
        </Scope>
      ))}
    </Layout>
  );
};
export default PathClipping;
