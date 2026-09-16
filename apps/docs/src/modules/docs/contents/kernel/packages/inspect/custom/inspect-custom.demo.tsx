import { createInspectorRegistry } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Layout, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { endpointInspector, endpointInspectorKey } from './endpoint-inspector';

const registry = createInspectorRegistry([endpointInspector]);

const Curve: FC<{ inspect?: boolean }> = props => {
  const { inspect = false } = props;
  const steps = (
    <>
      <Step kind="move" to={[-150, 42]} />
      <Step kind="cubic" control1={[-78, -88]} control2={[82, 88]} to={[150, -42]} />
    </>
  );

  return inspect ? (
    <InspectPath
      request={{ inspector: endpointInspectorKey, options: true }}
      style={{ stroke: 'dimgray', strokeWidth: 3 }}
    >
      {steps}
    </InspectPath>
  ) : (
    <Path style={{ stroke: 'dimgray', strokeWidth: 3 }}>{steps}</Path>
  );
};

/** Register and request the custom endpoint Inspector. */
const Demo: FC = () => (
  <InspectLayout registry={registry}>
    <Curve inspect />
  </InspectLayout>
);

/** Keep Inspector selection outside the persistent drawing IR. */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout>
      <Curve />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
