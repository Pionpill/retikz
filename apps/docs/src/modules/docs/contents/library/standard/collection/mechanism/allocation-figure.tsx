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
      style={{ fill: 'dodgerblue', stroke: 'none', font: { size: 14 }, opacity: { fill: 0.4 } }}
    />
  );
  const b = (
    <Node
      position={[0, 0]}
      text="Bbbb"
      shape="rectangle"
      layout={{ minimumSize: { width: 80, height: 36 }, padding: 0, margin: 0 }}
      style={{ fill: 'darkorange', stroke: 'none', font: { size: 14 }, opacity: { fill: 0.4 } }}
    />
  );
  const label = { position: 'top' as const, font: { size: 12 }, opacity: 0.8 };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array label={{ ...label, text: t.auto }} layout={{ gap: 8 }} defaultCell={{ layout: { padding: 8 } }}>
        <ArrayItem>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
      <Array
        position={[330, 0]}
        label={{ ...label, text: t.content }}
        layout={{ gap: 8 }}
        defaultCell={{ layout: { width: 'content', padding: 8 } }}
      >
        <ArrayItem>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
      <Map
        position={[0, 125]}
        label={{ ...label, text: t.map }}
        layout={{ gap: 8 }}
        defaultCell={{ layout: { padding: 8 } }}
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
        position={[330, 125]}
        label={{ ...label, text: t.matrix }}
        layout={{ gap: 8 }}
        defaultCell={{ layout: { padding: 8 } }}
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
        position={[0, 310]}
        label={{ ...label, text: t.chain }}
        layout={{ gap: 24 }}
        defaultCell={{ layout: { padding: 8 } }}
      >
        <ChainCell>{a}</ChainCell>
        <ChainCell>{b}</ChainCell>
      </Chain>
      <Array
        position={[330, 310]}
        label={{ ...label, text: t.fixed }}
        layout={{ gap: 8 }}
        defaultCell={{ layout: { padding: 8 } }}
      >
        <ArrayItem layout={{ width: 60 }}>{a}</ArrayItem>
        <ArrayItem>{b}</ArrayItem>
      </Array>
    </Layout>
  );
};

export default AllocationFigure;
