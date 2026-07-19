import type { FC } from 'react';

import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { coordinateAsAnchorFrame } from './coordinate-as-anchor.controls';
import { coordinateAsAnchorControls } from './coordinate-as-anchor.en.controls';

export const previewControls = coordinateAsAnchorControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * `<Coordinate>` as a named virtual anchor
 * @description hub is an invisible center; four nodes use `position={{ of: 'hub', ... }}` symmetrically and all paths terminate there; fixed axes reveal its displacement from the world origin.
 */
const Demo: FC = () => {
  const values = usePreviewControls(coordinateAsAnchorControls);

  return (
    <Layout
      width={coordinateAsAnchorFrame.width}
      height={coordinateAsAnchorFrame.height}
      viewBox={coordinateAsAnchorFrame.viewBox}
    >
      <Draw way={coordinateAsAnchorFrame.xAxis} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-1} />
      <Draw way={coordinateAsAnchorFrame.yAxis} stroke="lightgray" dashPattern={[1, 4]} lineCap="round" zIndex={-1} />
      {/* Named virtual center — invisible, but the four `of` references all rely on it */}
      <Coordinate id="hub" position={[values.positionX, values.positionY]} />
      <Node id="N" position={{ direction: 'top', of: 'hub', distance: values.verticalDistance }}>
        North
      </Node>
      <Node id="S" position={{ direction: 'bottom', of: 'hub', distance: values.verticalDistance }}>
        South
      </Node>
      <Node id="E" position={{ direction: 'right', of: 'hub', distance: values.horizontalDistance }} shape="circle">
        East
      </Node>
      <Node id="W" position={{ direction: 'left', of: 'hub', distance: values.horizontalDistance }} shape="circle">
        West
      </Node>
      {/* Four paths converge at hub — visually meeting at a center point with no drawn shape */}
      <Draw way={['N', 'hub']} arrow="->" stroke="gray" />
      <Draw way={['S', 'hub']} arrow="->" stroke="gray" />
      <Draw way={['E', 'hub']} arrow="->" stroke="gray" />
      <Draw way={['W', 'hub']} arrow="->" stroke="gray" />
    </Layout>
  );
};

export default Demo;
