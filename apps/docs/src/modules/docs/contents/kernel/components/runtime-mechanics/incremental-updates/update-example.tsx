import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { updateExampleI18n } from './update-example.i18n';

/** 前后状态图的语言 */
export type UpdateExampleProps = { lang?: Lang };

/** 并列展示同一对节点在填充变化前后的输出 */
const UpdateExample: FC<UpdateExampleProps> = props => {
  const { lang = 'zh' } = props;
  const t = updateExampleI18n[lang];
  return (
    <Layout runtime={{ mode: 'static' }} style={{ maxWidth: '100%', height: 'auto' }}>
      {[t.before, t.after].map((title, index) => (
        <Scope key={title} id={`state-${index}`} position={[index * 300, 0]}>
          <Node position={[40, -55]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Node
            id={`A-${index}`}
            position={[0, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 50, height: 36 } }}
            style={{ fill: index === 0 ? 'darkorange' : 'dodgerblue', textColor: 'currentColor' }}
          >
            A
          </Node>
          <Node
            position={[80, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 50, height: 36 } }}
            style={{ fill: 'none' }}
          >
            B
          </Node>
        </Scope>
      ))}
      <Draw
        way={[
          [130, 0],
          [250, 0],
        ]}
        arrow="->"
      />
      <Node position={[190, 60]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
        {t.change}
      </Node>
    </Layout>
  );
};

export default UpdateExample;
