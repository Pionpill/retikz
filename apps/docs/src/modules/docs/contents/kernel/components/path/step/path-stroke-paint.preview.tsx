import type { IRPaint } from '@retikz/core';
import { Layout, Path, Step } from '@retikz/react';

/** 图形参数 */
export type PathStrokePaintPreviewValues = {
  startColor: string;
  middleColor: string;
  endColor: string;
  gradientKind: 'linearGradient' | 'radialGradient' | 'conicGradient';
  linearAngle: number;
  center: [number, number];
  radius: number;
  conicAngle: number;
};

/** 绘制示例图形 */
export const PathStrokePaintPreview = (values: PathStrokePaintPreviewValues) => {
  const stops = [
    { offset: 0, color: values.startColor },
    { offset: 0.5, color: values.middleColor },
    { offset: 1, color: values.endColor },
  ];
  const gradient: IRPaint = (() => {
    switch (values.gradientKind) {
      case 'linearGradient':
        return { kind: 'linearGradient', angle: values.linearAngle, stops };
      case 'radialGradient':
        return { kind: 'radialGradient', center: values.center, radius: values.radius, stops };
      case 'conicGradient':
        return { kind: 'conicGradient', center: values.center, angle: values.conicAngle, stops };
    }
  })();

  return (
    <Layout viewBox={{ x: -210, y: -110, width: 420, height: 220 }}>
      <Path
        style={{
          stroke: gradient,
          strokeWidth: 10,
          lineCap: 'round',
        }}
      >
        <Step kind="move" to={[-165, -34]} />
        <Step kind="curve" control={[0, -112]} to={[165, -34]} />
      </Path>
      <Path style={{ fill: gradient, stroke: 'none' }}>
        <Step kind="rectangle" from={[-142, 2]} to={[142, 78]} cornerRadius={16} />
      </Path>
    </Layout>
  );
};
