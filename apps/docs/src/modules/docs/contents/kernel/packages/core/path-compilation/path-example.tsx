import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathExampleI18n } from './path-example.i18n';

/** 路径编译效果图的语言 */
export type PathExampleProps = { lang?: Lang };
/** 对照中心连线与真实边界裁剪、标签留白 */
const PathExample: FC<PathExampleProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathExampleI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} localNamespace position={[i * 310, 0]}>
          <Node position={[110, -56]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node id="a" shape="circle" layout={{ minimumSize: 48 }} style={{ fill: 'none', stroke: 'currentColor' }}>
            A
          </Node>
          <Node
            id="b"
            position={[220, 0]}
            shape="circle"
            layout={{ minimumSize: 48 }}
            style={{ fill: 'none', stroke: 'currentColor' }}
          >
            B
          </Node>
          <Path
            arrow={i === 1 ? { end: {} } : undefined}
            style={{ stroke: i === 1 ? 'dodgerblue' : 'gray', strokeWidth: 2 }}
          >
            <Step kind="move" to={i === 1 ? 'a' : [0, 0]} />
            <Step
              kind="line"
              to={i === 1 ? 'b' : [220, 0]}
              label={i === 1 ? { text: text.label, sloped: true, interrupt: true, font: { size: 14 } } : undefined}
            />
          </Path>
        </Scope>
      ))}
    </Layout>
  );
};
export default PathExample;
