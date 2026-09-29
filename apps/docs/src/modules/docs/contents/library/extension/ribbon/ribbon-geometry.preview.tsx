import type { IRRibbonPathOptions } from '@retikz/extension';
import { BulgeRibbonWidthProfileDefinition, createRibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

const ribbonPathKindDefinition = createRibbonPathKindDefinition({
  profiles: [BulgeRibbonWidthProfileDefinition],
});

const ribbonOf = (values: RibbonGeometryPreviewValues): IRRibbonPathOptions => {
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

/** 图形参数 */
export type RibbonGeometryPreviewValues = {
  widthMode: 'endpoints' | 'stops' | 'profile';
  startWidth: number;
  endWidth: number;
  middleWidth: number;
  peakWidth: number;
  endpointInterpolation: 'smooth' | 'linear';
  stopInterpolation: 'step' | 'smooth' | 'linear';
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  shadow: boolean;
};

/** 绘制示例图形 */
export const renderRibbonGeometryPreview = (values: RibbonGeometryPreviewValues) => {
  const resolvedValues = values;

  return (
    <Layout
      viewBox={{ x: -260, y: -130, width: 520, height: 260 }}
      extensions={{ pathKinds: [ribbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={ribbonOf(resolvedValues)}
        style={{
          fill: resolvedValues.fill,
          fillOpacity: resolvedValues.fillOpacity,
          stroke: resolvedValues.stroke,
          strokeWidth: resolvedValues.strokeWidth,
          ...(resolvedValues.shadow
            ? { shadow: { offsetX: 0, offsetY: 8, blur: 10, color: 'rgba(15, 23, 42, 0.35)' } }
            : {}),
        }}
      >
        <Step kind="move" to={[-210, 30]} />
        <Step kind="curve" control={[0, -115]} to={[210, 30]} />
      </Path>
    </Layout>
  );
};
