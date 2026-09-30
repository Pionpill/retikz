import type { IRBoundaryLabel } from '@retikz/core';
import type { IRRibbonPathOptions } from '@retikz/extension';
import { RibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

/** 端帽标签交互参数 */
export type RibbonCapLabelPreviewValues = {
  cap: 'round' | 'square' | 'arc';
  rotate: 'none' | 'radial' | 'tangent' | 'angle';
  textAngle: number;
  placement: 'inside' | 'outside';
  distance: number;
  keepUpright: boolean;
};

/** 将标签附着到最终端帽曲线 */
export const renderRibbonCapLabelPreview = (values: RibbonCapLabelPreviewValues) => {
  const cap: NonNullable<Extract<IRRibbonPathOptions, { mode?: 'centerline' }>['start']>['cap'] =
    values.cap === 'arc' ? { name: 'arc', params: { center: [0, 0], radius: 15 } } : { name: values.cap };
  const label = {
    text: 'A',
    placement: values.placement,
    distance: values.distance,
    rotate: values.rotate === 'angle' ? values.textAngle : values.rotate,
    keepUpright: values.keepUpright,
    textColor: 'currentColor',
    font: { size: 14 },
  } satisfies IRBoundaryLabel;

  return (
    <Layout
      viewBox={{ x: -260, y: -130, width: 520, height: 260 }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={{
          width: { kind: 'fixed', value: 30 },
          start: { cap, label },
          end: { cap, label: { ...label, text: 'B' } },
          sampling: { kind: 'fixed', samples: 64 },
        }}
        style={{ fill: '#60a5fa', fillOpacity: 0.75, stroke: '#2563eb', strokeWidth: 1 }}
      >
        <Step kind="move" to={[-190, 20]} />
        <Step kind="curve" control={[0, -115]} to={[190, 20]} />
      </Path>
    </Layout>
  );
};
