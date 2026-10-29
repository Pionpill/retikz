import { createInspectorRegistry } from '@retikz/inspect';
import { Path, Step } from '@retikz/react';
import type { FC } from 'react';

import { InspectionResultPreview } from '@/modules/docs/preview';

import { endpointInspector, endpointInspectorKey } from './endpoint-inspector';

const registry = createInspectorRegistry([endpointInspector]);
/** 自定义检查器的标记直径 */
export type EndpointInspectionProps = { size: number };
/** 主图固定，只有辅助标记随选项改变 */
export const EndpointInspection: FC<EndpointInspectionProps> = props => {
  const { size } = props;
  return (
    <InspectionResultPreview
      registry={registry}
      requests={[{ inspector: endpointInspectorKey, options: { size } }]}
      viewBox={{ x: -170, y: -110, width: 340, height: 220 }}
    >
      <Path style={{ stroke: 'dimgray', strokeWidth: 3 }}>
        <Step kind="move" to={[-150, 42]} />
        <Step kind="cubic" control1={[-78, -88]} control2={[82, 88]} to={[150, -42]} />
      </Path>
    </InspectionResultPreview>
  );
};
