import type { IRPathRibbonOptions } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ribbonEndpointsControls } from './ribbon-endpoints.controls';

export const previewControls = ribbonEndpointsControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

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

/** Ribbon 端点方向、对齐与端帽 playground */
const Demo: FC = () => {
  const values = usePreviewControls(ribbonEndpointsControls) as RibbonEndpointValues;
  const direction = directionOf(values);
  const cap: NonNullable<IRPathRibbonOptions['start']>['cap'] =
    values.cap === 'arc' ? { type: 'arc', center: [-190, 20], radius: values.width / 2 } : values.cap;

  return (
    <Layout width={400} height={200} viewBox={{ x: -260, y: -130, width: 520, height: 260 }}>
      <Path
        kind="ribbon"
        ribbon={{
          width: values.width,
          align: values.align,
          start: { direction, cap },
          end: {
            direction,
            cap: values.cap === 'arc' ? { type: 'arc', center: [190, 20], radius: values.width / 2 } : values.cap,
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
};

export default Demo;
