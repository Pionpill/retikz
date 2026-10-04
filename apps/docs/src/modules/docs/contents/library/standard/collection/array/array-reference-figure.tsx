import { Draw, Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { arrayReferenceFigureI18n } from './array-reference-figure.i18n';

/** Array 引用边界与容器标签示意图属性 */
export type ArrayReferenceFigureProps = { lang?: Lang };

/** 让固定单格边框、溢出文字、引用箭头和容器标签在同图可见 */
const ArrayReferenceFigure: FC<ArrayReferenceFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = arrayReferenceFigureI18n[lang];

  return (
    <Layout viewBox={{ x: -105, y: -90, width: 310, height: 235 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
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

export default ArrayReferenceFigure;
