import type { IRRibbonPathOptions } from '@retikz/extension';
import { RibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

const vectorOf = (angle: number): [number, number] => {
  const radians = (angle * Math.PI) / 180;
  return [Math.cos(radians), Math.sin(radians)];
};

const directionOf = (values: RibbonEndpointsPreviewValues): NonNullable<IRRibbonPathOptions['start']>['direction'] => {
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

/** 图形参数 */
export type RibbonEndpointsPreviewValues = {
  direction: 'auto' | 'angle' | 'vector' | 'polar';
  angle: number;
  align: 'center' | 'left' | 'right';
  cap: 'round' | 'butt' | 'square' | 'arc';
  width: number;
};

/** 绘制示例图形 */
export const renderRibbonEndpointsPreview = (values: RibbonEndpointsPreviewValues) => {
  const resolvedValues = values;
  const direction = directionOf(resolvedValues);
  const cap: NonNullable<IRRibbonPathOptions['start']>['cap'] =
    resolvedValues.cap === 'arc'
      ? { type: 'arc', center: [-190, 20], radius: resolvedValues.width / 2 }
      : resolvedValues.cap;

  return (
    <Layout
      viewBox={{ x: -260, y: -130, width: 520, height: 260 }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={{
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
        style={{ fill: '#8ac926', fillOpacity: 0.75, stroke: '#386641', strokeWidth: 1 }}
      >
        <Step kind="move" to={[-190, 20]} />
        <Step kind="curve" control={[0, -115]} to={[190, 20]} />
      </Path>
    </Layout>
  );
};
