import type { IRPaint } from '@retikz/core';
import { RibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

/** 流带外观参数 */
export type RibbonAppearancePreviewValues = {
  fillKind: 'solid' | 'linearGradient' | 'radialGradient' | 'conicGradient';
  fill: string;
  startColor: string;
  endColor: string;
  angle: number;
  radius: number;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
  shadow: boolean;
};

/** 固定中心线、宽度和取景，展示共享 Path 样式 */
export const renderRibbonAppearancePreview = (values: RibbonAppearancePreviewValues) => {
  const stops = [
    { offset: 0, color: values.startColor },
    { offset: 1, color: values.endColor },
  ];
  const fill: string | IRPaint = (() => {
    switch (values.fillKind) {
      case 'solid':
        return values.fill;
      case 'linearGradient':
        return { kind: 'linearGradient', angle: values.angle, stops };
      case 'radialGradient':
        return { kind: 'radialGradient', center: [0.5, 0.5], radius: values.radius, stops };
      case 'conicGradient':
        return { kind: 'conicGradient', center: [0.5, 0.5], angle: values.angle, stops };
    }
  })();

  return (
    <Layout
      viewBox={{ x: -260, y: -130, width: 520, height: 260 }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={{ width: { kind: 'taper', start: 16, end: 44, interpolation: 'smooth' } }}
        style={{
          fill,
          fillOpacity: values.fillOpacity,
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          ...(values.shadow ? { shadow: { offsetX: 0, offsetY: 8, blur: 10, color: 'rgba(15, 23, 42, 0.35)' } } : {}),
        }}
      >
        <Step kind="move" to={[-210, 30]} />
        <Step kind="curve" control={[0, -115]} to={[210, 30]} />
      </Path>
    </Layout>
  );
};
