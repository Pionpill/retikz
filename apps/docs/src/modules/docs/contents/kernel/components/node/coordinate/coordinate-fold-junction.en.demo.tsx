import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { coordinateFoldJunctionFrame } from './coordinate-fold-junction.controls';
import { coordinateFoldJunctionControls } from './coordinate-fold-junction.en.controls';

export const previewControls = coordinateFoldJunctionControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * Coordinate as a named junction for path convergence
 * @description Multiple step nodes converge to a shared decision junction with no rectangle or text; each path routes through via `<Draw way={['A', 'junction', 'B']}>`, and the Coordinate keeps only a center position for the endpoints to meet.
 */
const Demo: FC = () => {
  const values = usePreviewControls(coordinateFoldJunctionControls);

  return (
    <Layout
      width={coordinateFoldJunctionFrame.width}
      height={coordinateFoldJunctionFrame.height}
      viewBox={coordinateFoldJunctionFrame.viewBox}
    >
      <Node id="A" position={[-120, -55]}>
        A
      </Node>
      <Node id="B" position={[-120, 55]}>
        B
      </Node>
      <Coordinate id="junction" position={[values.junctionX, values.junctionY]} />
      <Node id="out" position={[120, 0]} shape="diamond">
        merged
      </Node>
      {/* Two lines first reach junction, then merge into out */}
      <Draw way={['A', 'junction', 'out']} arrow="->" stroke="gray" />
      <Draw way={['B', 'junction']} stroke="gray" />
    </Layout>
  );
};

export default Demo;
