import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { Path, Step } from '@retikz/react';
import type { FC } from 'react';

import { InspectionResultPreview, createBuiltinInspectPreviewSource } from '@/modules/docs/preview';

const registry = createDefaultInspectorRegistry();

/** 独立检查最终贝塞尔路径 */
const Demo: FC = () => (
  <InspectionResultPreview
    registry={registry}
    requests={[{ inspector: PATH_INSPECTOR_KEY, options: { controlPoints: true, labels: true } }]}
  >
    <Path style={{ stroke: 'dimgray', strokeWidth: 3 }}>
      <Step kind="move" to={[-150, 42]} />
      <Step kind="cubic" control1={[-78, -88]} control2={[82, 88]} to={[150, -42]} />
    </Path>
  </InspectionResultPreview>
);

export const previewSource = createBuiltinInspectPreviewSource(Demo, 'inspect-basic');
export default Demo;
