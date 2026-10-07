import { Layout, Node } from '@retikz/react';
import {
  Array,
  ArrayItem,
  Chain,
  ChainCell,
  Map,
  MapEntry,
  MapKey,
  MapValue,
  Matrix,
  MatrixRow,
  MatrixCell,
} from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { allocationFigureI18n } from './allocation-figure.i18n';

/** 集合排布对照图属性 */
export type AllocationFigureProps = { lang?: Lang };

/** 复用同尺寸内容，以真实集合输出比较尺寸策略 */
const AllocationFigure: FC<AllocationFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = allocationFigureI18n[lang];
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
  const label = { position: 'top' as const, font: { size: 12 }, opacity: 0.8 };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array layout={{ padding: 8, gap: 8 }} label={{ ...label, text: t.auto }}>
        <ArrayItem>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
      <Array
        transforms={[{ kind: 'translate', x: 330, y: 0 }]}
        layout={{ width: 'content', padding: 8, gap: 8 }}
        label={{ ...label, text: t.content }}
      >
        <ArrayItem>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
      <Map
        transforms={[{ kind: 'translate', x: 0, y: 125 }]}
        layout={{ padding: 8, gap: 8 }}
        label={{ ...label, text: t.map }}
      >
        <MapEntry>
          <MapKey>{a}</MapKey>
          <MapValue>{b}</MapValue>
        </MapEntry>
        <MapEntry>
          <MapKey>{b}</MapKey>
          <MapValue>{a}</MapValue>
        </MapEntry>
      </Map>
      <Matrix
        transforms={[{ kind: 'translate', x: 330, y: 125 }]}
        layout={{ padding: 8, gap: 8 }}
        label={{ ...label, text: t.matrix }}
      >
        <MatrixRow>
          <MatrixCell>{a}</MatrixCell>
          <MatrixCell>{b}</MatrixCell>
        </MatrixRow>
        <MatrixRow>
          <MatrixCell>{a}</MatrixCell>
          <MatrixCell>{b}</MatrixCell>
        </MatrixRow>
      </Matrix>
      <Chain
        transforms={[{ kind: 'translate', x: 0, y: 310 }]}
        layout={{ padding: 8, gap: 24 }}
        label={{ ...label, text: t.chain }}
      >
        <ChainCell>{a}</ChainCell>
        <ChainCell>{b}</ChainCell>
      </Chain>
      <Array
        transforms={[{ kind: 'translate', x: 330, y: 310 }]}
        layout={{ padding: 8, gap: 8 }}
        label={{ ...label, text: t.fixed }}
      >
        <ArrayItem layout={{ width: 60 }}>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
    </Layout>
  );
};

export default AllocationFigure;
