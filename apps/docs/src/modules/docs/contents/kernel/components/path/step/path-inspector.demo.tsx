import { PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import { InspectionResultPreview } from '@/modules/docs/preview';

const viewBox = { x: -120, y: -100, width: 240, height: 200 };
const curve = (
  <Path style={{ stroke: 'dimgray', strokeWidth: 3 }}>
    <Step kind="move" to={[-90, 30]} />
    <Step kind="curve" control={[0, -70]} to={[90, 30]} />
  </Path>
);

/** 用最终 Scene 路径观察曲线控制柄 */
const Demo: FC = () => (
  <InspectionResultPreview requests={[{ inspector: PATH_INSPECTOR_KEY }]} viewBox={viewBox}>
    {curve}
  </InspectionResultPreview>
);

export const previewSource = { canonicalRender: () => <Layout viewBox={viewBox}>{curve}</Layout> };
export default Demo;
