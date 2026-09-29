import { PathMark, Plot, PlotAxis, PlotScaffold, PlotTrack, PointMark } from '@retikz/plot-react';

import { operationsRows } from './coordinate-composition-tracks.data';

const TRACK_BAND_PROFILES = {
  balanced: {
    trend: { start: 0, end: 0.28 },
    drawdown: { start: 0.36, end: 0.64 },
    signal: { start: 0.72, end: 1 },
  },
  'trend-focus': {
    trend: { start: 0, end: 0.4 },
    drawdown: { start: 0.48, end: 0.72 },
    signal: { start: 0.8, end: 1 },
  },
  'signal-focus': {
    trend: { start: 0, end: 0.2 },
    drawdown: { start: 0.28, end: 0.52 },
    signal: { start: 0.6, end: 1 },
  },
} as const;

/** 图形参数 */
export type CoordinateCompositionTracksPreviewValues = {
  bandProfile: 'balanced' | 'trend-focus' | 'signal-focus';
  lineWidth: number;
  localAxes: boolean;
  xGridVisible: boolean;
  yGridVisible: boolean;
  trackGap: number;
  drawdownAreaVisible: boolean;
  signalPointSize: number;
};

/** 绘制示例图形 */
export const CoordinateCompositionTracksPreview = (values: CoordinateCompositionTracksPreviewValues) => {
  const bands = TRACK_BAND_PROFILES[values.bandProfile];
  const lineWidth = values.lineWidth;
  const localAxesVisible = values.localAxes;
  const xGridVisible = values.xGridVisible;
  const yGridVisible = values.yGridVisible;

  return (
    <Plot data={operationsRows} width={560} height={330}>
      <PlotScaffold id="ops" sharedRoles={['x']} spacing={{ trackGap: values.trackGap }}>
        <PlotAxis dimension="x" grid={xGridVisible} title="T" />
        <PlotTrack id="trend" band={{ role: 'y', ...bands.trend }}>
          {localAxesVisible ? <PlotAxis dimension="y" grid={yGridVisible} title="A" /> : null}
          <PathMark
            x="day"
            y="trend"
            order="day"
            stroke="#f97316"
            strokeWidth={lineWidth}
            lineCap="round"
            lineJoin="round"
          />
        </PlotTrack>
        <PlotTrack id="drawdown" band={{ role: 'y', ...bands.drawdown }}>
          {localAxesVisible ? <PlotAxis dimension="y" grid={yGridVisible} title="B" /> : null}
          {values.drawdownAreaVisible ? (
            <PathMark
              x="day"
              y="drawdown"
              order="day"
              closure={{ kind: 'baseline', baseline: 0 }}
              fill="rgba(148, 163, 184, 0.32)"
              stroke="none"
            />
          ) : null}
          <PathMark
            x="day"
            y="drawdown"
            order="day"
            stroke="#64748b"
            strokeWidth={lineWidth}
            lineCap="round"
            lineJoin="round"
          />
        </PlotTrack>
        <PlotTrack id="signal" band={{ role: 'y', ...bands.signal }}>
          {localAxesVisible ? <PlotAxis dimension="y" grid={yGridVisible} title="C" /> : null}
          <PathMark
            x="day"
            y="signal"
            order="day"
            stroke="#0891b2"
            strokeWidth={lineWidth}
            lineCap="round"
            lineJoin="round"
          />
          <PointMark
            x="day"
            y="signal"
            fill="#ecfeff"
            stroke="#0891b2"
            strokeWidth={1.5}
            size={values.signalPointSize}
          />
        </PlotTrack>
      </PlotScaffold>
    </Plot>
  );
};
