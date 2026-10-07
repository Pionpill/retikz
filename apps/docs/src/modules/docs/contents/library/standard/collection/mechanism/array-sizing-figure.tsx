import { Draw, Layout, Node } from '@retikz/react';
import { Array, ArrayItem } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { arraySizingFigureI18n } from './array-sizing-figure.i18n';

/** Array 等宽等高图属性 */
export type ArraySizingFigureProps = { lang?: Lang };

/** 比较独立单格需求与同一 Array 的自动分配，保持内容几何不变 */
const ArraySizingFigure: FC<ArraySizingFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = arraySizingFigureI18n[lang];
  const a = (
    <Node
      position={[0, 0]}
      text="A"
      shape="rectangle"
      layout={{ minimumSize: { width: 40, height: 24 }, padding: 0, margin: 0 }}
      style={{ fill: 'dodgerblue', fillOpacity: 0.4, stroke: 'none', font: { size: 14 } }}
    />
  );
  const b = (
    <Node
      position={[0, 0]}
      text="Bbbb"
      shape="rectangle"
      layout={{ minimumSize: { width: 80, height: 36 }, padding: 0, margin: 0 }}
      style={{ fill: 'darkorange', fillOpacity: 0.4, stroke: 'none', font: { size: 14 } }}
    />
  );
  const label = { position: 'bottom' as const, font: { size: 12 }, opacity: 0.8 };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[45, -30]} text={t.before} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }} />
      <Array layout={{ padding: 8 }} label={{ ...label, text: '56 × 40' }}>
        <ArrayItem>{a}</ArrayItem>
      </Array>
      <Array
        transforms={[{ kind: 'translate', x: 0, y: 85 }]}
        layout={{ padding: 8 }}
        label={{ ...label, text: '96 × 52' }}
      >
        <ArrayItem>{b}</ArrayItem>
      </Array>
      <Draw
        way={[[125, 65], { label: { text: t.operation, font: { size: 12 }, textColor: 'gray' } }, [280, 65]]}
        arrow="->"
      />
      <Array
        transforms={[{ kind: 'translate', x: 305, y: 39 }]}
        layout={{ width: 'auto', height: 'auto', padding: 8, gap: 8 }}
        label={{ ...label, text: t.after }}
      >
        <ArrayItem>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
    </Layout>
  );
};

export default ArraySizingFigure;
