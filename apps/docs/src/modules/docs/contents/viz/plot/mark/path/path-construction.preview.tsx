import { PathMark, Plot, PlotAxis, PlotPathStep, PlotScale, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { rows } from './path-construction.data';

/** 路径构造示例参数 */
export type PathConstructionValues = {
  kind: 'line' | 'bend' | 'fold';
  angle: number;
  direction: 'left' | 'right';
  via: '-|' | '|-' | '-|-' | '|-|';
  fraction: number;
  radius: number;
  width: number;
  arrow: 'none' | 'end' | 'both';
  dashed: boolean;
};
/** 固定散点关系，观察路径构造与样式变化 */
export const PathConstructionPreview: FC<PathConstructionValues> = props => {
  const { kind, angle, direction, via, fraction, radius, width, arrow, dashed } = props;
  const target = { mark: 'nodes', key: { field: 'target' } };
  return (
    <Layout viewBox={{ x: -60, y: -70, width: 520, height: 380 }}>
      <Plot data={rows} width={400} height={240}>
        <PlotScale dimension="x" type="linear" domain={[0, 10]} />
        <PlotScale dimension="y" type="linear" domain={[0, 10]} />
        <PointMark
          id="nodes"
          encodings={{ anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } }, label: { text: 'id' } }}
          properties={{ size: 8, label: { position: 'top', distance: 5 } }}
        />
        <PathMark
          arrow={arrow === 'none' ? undefined : arrow === 'both' ? '<->' : '->'}
          properties={{
            strokeWidth: width,
            cornerRadius: kind === 'fold' ? radius : undefined,
            dashPattern: dashed ? [6, 4] : undefined,
            zIndex: -1,
          }}
        >
          <PlotPathStep kind="move" to={{ mark: 'nodes', key: { field: 'id' } }} />
          {kind === 'line' ? (
            <PlotPathStep kind="line" to={target} />
          ) : kind === 'bend' ? (
            <PlotPathStep kind="bend" to={target} bendDirection={direction} bendAngle={angle} />
          ) : via === '-|' || via === '|-' ? (
            <PlotPathStep kind="fold" to={target} via={via} />
          ) : (
            <PlotPathStep kind="fold" to={target} via={via} fraction={fraction} />
          )}
        </PathMark>
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" />
      </Plot>
    </Layout>
  );
};
