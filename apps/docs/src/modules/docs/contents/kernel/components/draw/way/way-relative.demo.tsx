import type { FC } from 'react';

import { DrawWay } from '@retikz/core';
import { Circle, Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { wayRelativeControls } from './way-relative.controls';
import { WayAccumulateStart, WayRelativeFirstOffset, WayRelativeStart, WayRelativeViewBox } from './way-relative.data';

export const previewControls = wayRelativeControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** 同屏对照 Relative 沿用基准与 Accumulate 推进基准 */
const Demo: FC = () => {
  const values = usePreviewControls(wayRelativeControls);
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
    <Layout width={400} height={218} viewBox={WayRelativeViewBox}>
      <Node id="A" position={WayRelativeStart} stroke="gray" dashed>
        +
      </Node>
      <Node id="B" position={WayAccumulateStart} stroke="gray" dashed>
        ++
      </Node>

      <Draw
        way={[WayRelativeStart, [relativeEnd[0], WayRelativeStart[1]], relativeEnd]}
        stroke="gray"
        dashPattern={[1, 4]}
        lineCap="round"
      />
      <Draw
        way={[accumulateFirst, [accumulateEnd[0], accumulateFirst[1]], accumulateEnd]}
        stroke="gray"
        dashPattern={[1, 4]}
        lineCap="round"
      />

      <Draw
        way={[
          'A.center',
          { position: WayRelativeFirstOffset, type: DrawWay.Relative },
          { position: values.offset, type: DrawWay.Relative },
        ]}
        arrow="->"
        stroke="dodgerblue"
        strokeWidth={2}
      />
      <Draw
        way={[
          'B.center',
          { position: WayRelativeFirstOffset, type: DrawWay.Accumulate },
          { position: values.offset, type: DrawWay.Accumulate },
        ]}
        arrow="->"
        stroke="darkorange"
        strokeWidth={2}
      />

      <Circle center={relativeFirst} radius={3} fill="white" stroke="dodgerblue" />
      <Circle center={relativeEnd} radius={4} fill="dodgerblue" stroke="none" />
      <Circle center={accumulateFirst} radius={3} fill="white" stroke="darkorange" />
      <Circle center={accumulateEnd} radius={4} fill="darkorange" stroke="none" />
    </Layout>
  );
};

export default Demo;
