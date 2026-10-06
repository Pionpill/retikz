import { Layout, Node } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { identityFieldsI18n } from './identity-fields.i18n';

/** 身份字段对照图的语言 */
export type IdentityFieldsProps = Readonly<{ lang?: Lang }>;

/** 蓝色行表示稳定身份，橙色行表示实体自身的变化数据 */
const IdentityFields: FC<IdentityFieldsProps> = props => {
  const { lang = 'zh' } = props;
  const text = identityFieldsI18n[lang];
  return (
    <Layout>
      {[
        { title: text.before, x: 0, color: 'red' },
        { title: text.after, x: 320, color: 'blue' },
      ].map(state => (
        <Map
          key={state.x}
          transforms={[{ kind: 'translate', x: state.x, y: 0 }]}
          label={{ text: state.title, font: { size: 12 } }}
          layout={{ height: 28, key: { width: 64 }, value: { width: 190 } }}
          style={{ font: { size: 13 } }}
          entries={[
            {
              key: { content: 'owner', style: { fill: 'dodgerblue' } },
              value: { content: 'example/graph', style: { fill: 'dodgerblue' } },
            },
            {
              key: { content: 'path', style: { fill: 'dodgerblue' } },
              value: { content: "['nodes', 'A']", style: { fill: 'dodgerblue' } },
            },
            {
              key: { content: 'color', style: { fill: 'darkorange' } },
              value: { content: state.color, style: { fill: 'darkorange' } },
            },
          ]}
        />
      ))}
      <Node
        position={[285, 125]}
        text={[text.same, text.changed]}
        style={{ stroke: 'none', fill: 'none', font: { size: 13 } }}
      />
    </Layout>
  );
};
export default IdentityFields;
