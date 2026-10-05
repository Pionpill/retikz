import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { inputsFigureI18n } from './inputs-figure.i18n';

/** 图示属性 */
export type InputsFigureProps = { lang?: Lang };

/** 展示当前小节的集合处理机制 */
const InputsFigure: FC<InputsFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = inputsFigureI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[
        { id: 'data', title: t.data, key: 'data', value: '[1, 2]' },
        { id: 'items', title: t.items, key: 'items', value: "['1', '2']" },
        { id: 'skeleton', title: t.skeleton, key: 'skeleton.labels', value: "['1', '2']" },
      ].map((item, i) => (
        <Map
          key={item.id}
          id={item.id}
          transforms={[{ kind: 'translate', x: 0, y: i * 85 }]}
          label={{ text: item.title, position: 'top', font: { size: 12 }, opacity: 0.8 }}
          entries={[{ key: item.key, value: item.value }]}
          style={{ font: { size: 14 } }}
        />
      ))}
      <Map
        id="resolved"
        transforms={[{ kind: 'translate', x: 350, y: 25 }]}
        label={{ text: t.result, position: 'top', font: { size: 12 }, opacity: 0.8 }}
        entries={[
          { key: 'content.type', value: 'node' },
          { key: 'content.text', value: '1' },
          { key: 'layout.padding', value: '8 / 8 / 8 / 8' },
          { key: 'layout.overflow', value: 'visible' },
        ]}
        style={{ font: { size: 14 } }}
      />
      {['data', 'items', 'skeleton'].map(id => (
        <Draw key={id} way={[`${id}.right`, { via: '-|-' }, 'resolved.left']} arrow="->" />
      ))}
    </Layout>
  );
};

export default InputsFigure;
