import { Draw, Layout, Node } from '@retikz/react';
import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { type FC, Fragment } from 'react';

import { type CrossRow, crossModel, crossRows } from './cross-mark-lowering.data';

const PLOT_X = 30;
const PLOT_Y = 20;
const PLOT_WIDTH = 420;
const PLOT_HEIGHT = 260;
const PLOT_MARGIN = { top: 20, right: 20, bottom: 36, left: 42 };

type CrossMarkProps = {
  size?: number;
  x: string;
  y: string;
};

/**
 * Source-extension declaration component.
 * @description In a real built-in registration this component would be collected by buildPlotSpec
 * and assembled into CrossMark IR; the rendering behavior still lives in the registry lowering entry.
 */
const CrossMark: FC<CrossMarkProps> = () => null;

const projectPreviewPoint = (row: CrossRow): [number, number] => {
  const plotAreaWidth = PLOT_WIDTH - PLOT_MARGIN.left - PLOT_MARGIN.right;
  const plotAreaHeight = PLOT_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom;
  const x = PLOT_X + PLOT_MARGIN.left + ((row.x - 1) / 2) * plotAreaWidth;
  const y = PLOT_Y + PLOT_MARGIN.top + ((70 - row.value) / 50) * plotAreaHeight;
  return [x, y];
};

type CrossGlyphProps = {
  color: string;
  label: string;
  size: number;
  x: number;
  y: number;
};

const CrossGlyph: FC<CrossGlyphProps> = (props) => {
  const { color, label, size, x, y } = props;

  return (
    <Fragment>
      <Draw way={[[x - size, y - size], [x + size, y + size]]} stroke={color} strokeWidth={2.5} />
      <Draw way={[[x - size, y + size], [x + size, y - size]]} stroke={color} strokeWidth={2.5} />
      <Node position={{ of: [x, y], offset: [0, 24] }} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
        {label}
      </Node>
    </Fragment>
  );
};

const Demo: FC = () => (
  <Layout width={500} height={310} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={crossRows}
      model={crossModel}
      colors={['transparent']}
      width={PLOT_WIDTH}
      height={PLOT_HEIGHT}
      margin={PLOT_MARGIN}
      x={PLOT_X}
      y={PLOT_Y}
    >
      <CrossMark x="x" y="value" size={10} />
      {/* Preview-only scale anchor: remove this after CrossMark is collected by buildPlotSpec. */}
      <PointMark x="x" y="value" color="kind" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>

    {crossRows.map(row => {
      const [x, y] = projectPreviewPoint(row);
      return <CrossGlyph key={row.label} x={x} y={y} size={10} color="#2563eb" label={row.label} />;
    })}
  </Layout>
);

export default Demo;
