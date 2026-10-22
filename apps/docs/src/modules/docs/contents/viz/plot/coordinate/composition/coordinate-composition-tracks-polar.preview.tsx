import { IntervalMark, PathMark, Plot, PlotAxis, PlotScaffold, PlotTrack, PointMark } from '@retikz/plot-react';

import { polarTrackRows } from './coordinate-composition-tracks-polar.data';

/** 图形参数 */
export type CoordinateCompositionTracksPolarPreviewValues = {
  startAngle: number;
  lineWidth: number;
  pointSize: number;
  localAxes: boolean;
  xGridVisible: boolean;
  yGridVisible: boolean;
  innerRadius: number;
  sweepAngle: number;
  trackGap: number;
  sectorPadAngle: number;
  sectorOpacity: number;
};

/** 绘制示例图形 */
export const CoordinateCompositionTracksPolarPreview = (values: CoordinateCompositionTracksPolarPreviewValues) => {
  const startAngle = values.startAngle;
  const lineWidth = values.lineWidth;
  const pointSize = values.pointSize;
  const localAxesVisible = values.localAxes;
  const xGridVisible = values.xGridVisible;
  const yGridVisible = values.yGridVisible;

  return (
    <Plot
      data={polarTrackRows}
      coordinate={{
        type: 'polar2D',
        innerRadius: values.innerRadius,
        startAngle,
        endAngle: startAngle + values.sweepAngle,
      }}
      width={520}
      height={330}
    >
      <PlotScaffold id="radar" sharedRoles={['x']} spacing={{ trackGap: values.trackGap }}>
        <PlotAxis dimension="x" grid={xGridVisible} title="area" />
        <PlotTrack id="signal" band={{ role: 'y', start: 0.1, end: 0.4 }}>
          {localAxesVisible ? <PlotAxis dimension="y" grid={yGridVisible} title="signal" /> : null}
          <PathMark
            encodings={{ order: 'order', position: { x: { field: 'area' }, y: { field: 'signal' } } }}
            properties={{ stroke: 'darkorange', strokeWidth: lineWidth }}
          />
          <PointMark
            encodings={{ position: { x: { field: 'area' }, y: { field: 'signal' } } }}
            properties={{ fill: 'moccasin', stroke: 'darkorange', strokeWidth: 1, size: pointSize }}
          />
        </PlotTrack>
        <PlotTrack id="capacity" band={{ role: 'y', start: 0.5, end: 0.76 }}>
          {localAxesVisible ? <PlotAxis dimension="y" grid={yGridVisible} title="capacity" /> : null}
          <PathMark
            encodings={{ order: 'order', position: { x: { field: 'area' }, y: { field: 'capacity' } } }}
            properties={{ stroke: 'steelblue', strokeWidth: lineWidth }}
          />
          <PointMark
            encodings={{ position: { x: { field: 'area' }, y: { field: 'capacity' } } }}
            properties={{ fill: 'lightblue', stroke: 'steelblue', strokeWidth: 1, size: pointSize }}
          />
        </PlotTrack>
        <PlotTrack id="sector" band={{ role: 'y', start: 0.86, end: 1 }}>
          <IntervalMark
            encodings={{ color: 'area', position: { x: { field: 'area' }, y: { field: 'outer' } } }}
            properties={{
              padAngle: values.sectorPadAngle,
              stroke: '#ffffff',
              strokeWidth: 1,
              opacity: { fill: values.sectorOpacity },
            }}
          />
        </PlotTrack>
      </PlotScaffold>
    </Plot>
  );
};
