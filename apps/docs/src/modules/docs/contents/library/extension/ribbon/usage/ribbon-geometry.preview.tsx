import type { IRRibbonPathOptions } from '@retikz/extension';
import { RibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

const ribbonOf = (values: RibbonGeometryPreviewValues): IRRibbonPathOptions => {
  switch (values.widthMode) {
    case 'fixed':
      return { width: { kind: 'fixed', value: values.fixedWidth } };
    case 'taper':
      return {
        width: {
          kind: 'taper',
          start: values.startWidth,
          end: values.endWidth,
          interpolation: values.endpointInterpolation,
        },
        sampling: { kind: 'fixed', samples: 64 },
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
        sampling: { kind: 'fixed', samples: 64 },
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

/** 图形参数 */
export type RibbonGeometryPreviewValues = {
  widthMode: 'fixed' | 'taper' | 'stops' | 'profile';
  fixedWidth: number;
  startWidth: number;
  endWidth: number;
  middleWidth: number;
  peakWidth: number;
  endpointInterpolation: 'smooth' | 'linear';
  stopInterpolation: 'step' | 'smooth' | 'linear';
};

/** 绘制示例图形 */
export const renderRibbonGeometryPreview = (values: RibbonGeometryPreviewValues) => {
  const resolvedValues = values;

  return (
    <Layout
      viewBox={{ x: -260, y: -130, width: 520, height: 260 }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={ribbonOf(resolvedValues)}
        style={{ fill: '#38bdf8', fillOpacity: 0.75, stroke: '#075985', strokeWidth: 1 }}
      >
        <Step kind="move" to={[-210, 30]} />
        <Step kind="curve" control={[0, -115]} to={[210, 30]} />
      </Path>
    </Layout>
  );
};
