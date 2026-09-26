import { Draw, Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { listReferenceFigureI18n } from './list-reference-figure.i18n';

/** List 引用边界与容器标签示意图属性 */
export type ListReferenceFigureProps = { lang?: Lang };

/** 让固定单格边框、溢出文字、引用箭头和容器标签在同图可见 */
const ListReferenceFigure: FC<ListReferenceFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = listReferenceFigureI18n[lang];

  return (
    <Layout viewBox={{ x: -105, y: -90, width: 310, height: 235 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <List
        items={[{ content: t.content, id: 'target' }]}
        label={{ text: t.label, position: 'top', distance: 18, font: { size: 13 } }}
        layout={{ width: 82, height: 42, padding: 0, overflow: 'visible' }}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.14, font: { size: 14 } }}
      />
      <Draw
        way={[
          [41, 112],
          { label: { text: t.reference, position: 0.5, side: 'right', textColor: 'gray', font: { size: 12 } } },
          'target.bottom',
        ]}
        arrow="->"
      />
    </Layout>
  );
};

export default ListReferenceFigure;
