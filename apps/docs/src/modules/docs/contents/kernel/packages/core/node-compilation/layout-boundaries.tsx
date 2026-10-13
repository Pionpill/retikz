import { Coordinate, Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutBoundariesI18n } from './layout-boundaries.i18n';

/** 连接面示意图的语言 */
export type LayoutBoundariesProps = { lang?: Lang };

/** 由真实连接面计算端点，点线仅辅助显示计算范围 */
const LayoutBoundaries: FC<LayoutBoundariesProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutBoundariesI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} localNamespace position={[i * 224, 0]}>
          <Node position={[0, -74]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node
            id="n"
            shape="circle"
            boundary={i === 0 ? 'shape' : 'rectangle'}
            layout={{ minimumSize: 80, padding: 0, margin: i === 2 ? 12 : 0 }}
            style={{ fill: 'none', stroke: 'currentColor' }}
          >
            N
          </Node>
          {i > 0 && (
            <Node
              shape="rectangle"
              layout={{ minimumSize: i === 2 ? 104 : 80, padding: 0 }}
              style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4] }}
            />
          )}
          <Coordinate id="outside" position={[80, 72]} />
          <Draw way={['outside', 'n']} arrow="->" />
        </Scope>
      ))}
      <Node position={[224, 108]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {text.note}
      </Node>
    </Layout>
  );
};
export default LayoutBoundaries;
