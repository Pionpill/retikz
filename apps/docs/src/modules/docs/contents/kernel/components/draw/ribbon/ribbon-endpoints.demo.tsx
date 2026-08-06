import type { IRPathRibbonOptions } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, ribbonEndpointsControls } from './ribbon-endpoints.controls';

export const previewControls = ribbonEndpointsControls;

type RibbonEndpointValues = PreviewControlValuesFor<typeof ribbonEndpointsControls>;

/** 把角度转换为单位方向向量 */
const vectorOf = (angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
};

/** 把面板选择转换为 Ribbon 端点方向 */
const directionOf = (values: RibbonEndpointValues): NonNullable<IRPathRibbonOptions['start']>['direction'] => {
  switch (values.direction) {
    case 'auto':
      return undefined;
    case 'angle':
      return values.angle;
    case 'vector':
      return vectorOf(values.angle);
    case 'polar':
      return { angle: values.angle, radius: 1 };
  }
};

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const resolvedValues = values as RibbonEndpointValues;
  const direction = directionOf(resolvedValues);
  const cap: NonNullable<IRPathRibbonOptions['start']>['cap'] =
    resolvedValues.cap === 'arc'
      ? { type: 'arc', center: [-190, 20], radius: resolvedValues.width / 2 }
      : resolvedValues.cap;

  return (
    <Layout width={400} height={200} viewBox={{ x: -260, y: -130, width: 520, height: 260 }}>
      <Path
        kind="ribbon"
        ribbon={{
          width: resolvedValues.width,
          align: resolvedValues.align,
          start: { ...(direction === undefined ? {} : { direction }), cap },
          end: {
            ...(direction === undefined ? {} : { direction }),
            cap:
              resolvedValues.cap === 'arc'
                ? { type: 'arc', center: [190, 20], radius: resolvedValues.width / 2 }
                : resolvedValues.cap,
          },
          samples: 64,
        }}
        fill="#8ac926"
        fillOpacity={0.75}
        stroke="#386641"
        strokeWidth={1}
      >
        <Step kind="move" to={[-190, 20]} />
        <Step kind="curve" control={[0, -115]} to={[190, 20]} />
      </Path>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** Ribbon 端点方向、对齐与端帽 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
