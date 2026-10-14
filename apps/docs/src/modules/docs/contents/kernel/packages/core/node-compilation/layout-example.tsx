import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutExampleI18n } from './layout-example.i18n';

/** 节点宽度对照的语言 */
export type LayoutExampleProps = { lang?: Lang };

/** 保持正文一致，对照折行与附属标签 */
const LayoutExample: FC<LayoutExampleProps> = props => {
  const { lang = 'zh' } = props;
  const text = layoutExampleI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 218, 0]}>
          <Node position={[0, -76]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node
            shape="rectangle"
            cornerRadius={4}
            layout={{ maxTextWidth: i === 0 ? 190 : 92, padding: 10, lineHeight: 24 }}
            style={{ fill: 'none', stroke: 'currentColor', font: { size: 16 } }}
            label={
              i === 2
                ? { text: text.label, position: 'bottom', distance: 14, font: { size: 12 }, textColor: 'gray' }
                : undefined
            }
          >
            {text.body}
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};
export default LayoutExample;
