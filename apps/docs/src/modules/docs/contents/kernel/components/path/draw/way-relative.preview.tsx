import { DrawWay } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { Circle } from '@retikz/standard-react/shape';

import { WayAccumulateStart, WayRelativeFirstOffset, WayRelativeStart, WayRelativeViewBox } from './way-relative.data';

/** 图形参数 */
export type WayRelativePreviewValues = {
  offset: [number, number];
};

/** 绘制示例图形 */
export const WayRelativePreview = (values: WayRelativePreviewValues) => {
  const relativeFirst: [number, number] = [WayRelativeStart[0] + WayRelativeFirstOffset[0], WayRelativeStart[1]];
  const relativeEnd: [number, number] = [
    WayRelativeStart[0] + values.offset[0],
    WayRelativeStart[1] + values.offset[1],
  ];
  const accumulateFirst: [number, number] = [WayAccumulateStart[0] + WayRelativeFirstOffset[0], WayAccumulateStart[1]];
  const accumulateEnd: [number, number] = [
    accumulateFirst[0] + values.offset[0],
    accumulateFirst[1] + values.offset[1],
  ];

  return (
    <Layout viewBox={WayRelativeViewBox}>
      <Node id="A" position={WayRelativeStart} style={{ stroke: 'gray', dashed: true }}>
        +
      </Node>
      <Node id="B" position={WayAccumulateStart} style={{ stroke: 'gray', dashed: true }}>
        ++
      </Node>

      <Draw
        way={[WayRelativeStart, [relativeEnd[0], WayRelativeStart[1]], relativeEnd]}
        style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
      />
      <Draw
        way={[accumulateFirst, [accumulateEnd[0], accumulateFirst[1]], accumulateEnd]}
        style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
      />

      <Draw
        way={[
          'A.center',
          { position: WayRelativeFirstOffset, type: DrawWay.Relative },
          { position: values.offset, type: DrawWay.Relative },
        ]}
        arrow="->"
        style={{ stroke: 'dodgerblue', strokeWidth: 2 }}
      />
      <Draw
        way={[
          'B.center',
          { position: WayRelativeFirstOffset, type: DrawWay.Accumulate },
          { position: values.offset, type: DrawWay.Accumulate },
        ]}
        arrow="->"
        style={{ stroke: 'darkorange', strokeWidth: 2 }}
      />

      <Circle center={relativeFirst} radius={3} style={{ fill: 'white', stroke: 'dodgerblue' }} />
      <Circle center={relativeEnd} radius={4} style={{ fill: 'dodgerblue', stroke: 'none' }} />
      <Circle center={accumulateFirst} radius={3} style={{ fill: 'white', stroke: 'darkorange' }} />
      <Circle center={accumulateEnd} radius={4} style={{ fill: 'darkorange', stroke: 'none' }} />
    </Layout>
  );
};
