import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutBoxesI18n } from './layout-boxes.i18n';

/** 节点盒模型图的语言 */
export type LayoutBoxesProps = { lang?: Lang };

/** 以两倍比例绘制已测得的正文盒及其派生范围 */
const LayoutBoxes: FC<LayoutBoxesProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutBoxesI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 220, 0]}>
          <Node position={[0, -92]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          {i === 2 && (
            <Node
              shape="rectangle"
              layout={{ minimumSize: { width: 184, height: 120 }, padding: 0 }}
              style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4] }}
            />
          )}
          <Node
            shape="rectangle"
            layout={{ minimumSize: { width: i === 0 ? 112 : 160, height: i === 0 ? 80 : 96 }, padding: 0 }}
            style={{ fill: 'none', stroke: 'currentColor' }}
          />
          <Node
            shape="rectangle"
            layout={{ minimumSize: { width: 80, height: 48 }, padding: 0 }}
            style={{ fill: 'dodgerblue', opacity: { fill: 0.12 }, stroke: 'none', font: { size: 14 } }}
          >
            {text.content}
          </Node>
          <Node position={[0, 88]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
            {text.sizes[i]}
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};
export default LayoutBoxes;
