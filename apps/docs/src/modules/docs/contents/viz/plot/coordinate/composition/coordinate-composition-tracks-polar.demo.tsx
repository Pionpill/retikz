import { Axis, IntervalMark, PathMark, Plot, PointMark, Scaffold, Track } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS,
  coordinateCompositionTracksPolarControls,
  previewControlContract,
} from './coordinate-composition-tracks-polar.controls';
import { polarTrackRows } from './coordinate-composition-tracks-polar.data';

/** 注册回退使用的极坐标轨道数据面板 */
export const previewControls = coordinateCompositionTracksPolarControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const startAngle = values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.startAngle];
  const lineWidth = values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.lineWidth];
  const pointSize = values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.pointSize];
  const localAxesVisible = values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes];
  const xGridVisible = values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible];
  const yGridVisible = values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible];

  return (
    <Plot
      data={polarTrackRows}
      coordinate={{
        type: 'polar2D',
        innerRadius: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.innerRadius],
        startAngle,
        endAngle: startAngle + values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sweepAngle],
      }}
      width={520}
      height={330}
    >
      <Scaffold
        id="radar"
        sharedRoles={['x']}
        spacing={{ trackGap: values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.trackGap] }}
      >
        <Axis dimension="x" grid={xGridVisible} title="area" />
        <Track id="signal" band={{ role: 'y', start: 0.1, end: 0.4 }}>
          {localAxesVisible ? <Axis dimension="y" grid={yGridVisible} title="signal" /> : null}
          <PathMark x="area" y="signal" order="order" stroke="darkorange" strokeWidth={lineWidth} />
          <PointMark x="area" y="signal" fill="moccasin" stroke="darkorange" strokeWidth={1} size={pointSize} />
        </Track>
        <Track id="capacity" band={{ role: 'y', start: 0.5, end: 0.76 }}>
          {localAxesVisible ? <Axis dimension="y" grid={yGridVisible} title="capacity" /> : null}
          <PathMark x="area" y="capacity" order="order" stroke="steelblue" strokeWidth={lineWidth} />
          <PointMark x="area" y="capacity" fill="lightblue" stroke="steelblue" strokeWidth={1} size={pointSize} />
        </Track>
        <Track id="sector" band={{ role: 'y', start: 0.86, end: 1 }}>
          <IntervalMark
            x="area"
            y="outer"
            color="area"
            padAngle={values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorPadAngle]}
            stroke="#ffffff"
            strokeWidth={1}
            fillOpacity={values[COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorOpacity]}
          />
        </Track>
      </Scaffold>
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 多条径向轨道共享同一组角度分类 */
export default controlledPreview.Component;
