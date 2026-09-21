import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { blendOrderI18n } from './blend-order.i18n';

/** 混合顺序图的语言参数 */
export type BlendOrderProps = { lang?: Lang };
/** 固定颜色和模式，只改变两个矩形的绘制先后 */
const BlendOrder: FC<BlendOrderProps> = props => {
  const { lang = 'zh' } = props;
  const text = blendOrderI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, index) => (
        <Scope key={title}>
          <Node position={[index * 185, -78]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node
            position={[index * 185, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 154, height: 124 } }}
            style={{ fill: 'white', stroke: 'none' }}
          />
          {(index === 0 ? ['a'] : index === 1 ? ['a', 'b'] : ['b', 'a']).map(id => (
            <Node
              key={id}
              position={[index * 185 + (id === 'a' ? -20 : 20), id === 'a' ? -14 : 14]}
              shape="rectangle"
              layout={{ minimumSize: { width: 92, height: 66 } }}
              style={{
                fill: id === 'a' ? 'darkorange' : 'dodgerblue',
                stroke: 'none',
                blendMode: id === 'a' ? 'normal' : 'multiply',
              }}
            />
          ))}
          <Node
            position={[index * 185, 84]}
            style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}
          >
            {text.notes[index]}
          </Node>
        </Scope>
      ))}
      <Node position={[185, 112]} style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}>
        {text.background}
      </Node>
    </Layout>
  );
};
export default BlendOrder;
