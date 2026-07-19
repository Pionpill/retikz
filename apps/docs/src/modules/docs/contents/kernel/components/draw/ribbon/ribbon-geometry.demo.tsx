import type { IRPathRibbonOptions } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewControlValuesFor, PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ribbonGeometryControls } from './ribbon-geometry.controls';

export const previewControls = ribbonGeometryControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

type RibbonGeometryValues = PreviewControlValuesFor<typeof ribbonGeometryControls>;

/** 把面板值转换为 Ribbon 宽度契约 */
const ribbonOf = (values: RibbonGeometryValues): IRPathRibbonOptions => {
  switch (values.widthMode) {
    case 'endpoints':
      return {
        start: { width: values.startWidth },
        end: { width: values.endWidth },
        interpolation: values.endpointInterpolation,
        samples: true,
      };
    case 'stops':
      return {
        width: {
          kind: 'stops',
          stops: [
            { offset: 0, value: values.startWidth },
            { offset: 0.5, value: values.middleWidth },
            { offset: 1, value: values.endWidth },
          ],
          interpolation: values.stopInterpolation,
        },
        samples: true,
      };
    case 'profile':
      return {
        width: {
          kind: 'profile',
          name: 'bulge',
          params: { base: values.startWidth, peak: values.peakWidth },
        },
        sampling: { kind: 'fixed', samples: 33 },
      };
  }
};

/** Ribbon 宽度与样式 playground */
const Demo: FC = () => {
  const values = usePreviewControls(ribbonGeometryControls) as RibbonGeometryValues;

  return (
    <Layout width={520} height={260} viewBox={{ x: -260, y: -130, width: 520, height: 260 }}>
      <Path
        kind="ribbon"
        ribbon={ribbonOf(values)}
        fill={values.fill}
        fillOpacity={values.fillOpacity}
        stroke={values.stroke}
        strokeWidth={values.strokeWidth}
        shadow={values.shadow ? { offsetX: 0, offsetY: 8, blur: 10, color: 'rgba(15, 23, 42, 0.35)' } : undefined}
      >
        <Step kind="move" to={[-210, 30]} />
        <Step kind="curve" control={[0, -115]} to={[210, 30]} />
      </Path>
    </Layout>
  );
};

export default Demo;
