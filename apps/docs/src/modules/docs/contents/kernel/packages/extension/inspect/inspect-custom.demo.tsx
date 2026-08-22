import type { FC } from 'react';

import { createDefaultInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { PATH_ENDPOINTS_INSPECTOR, PATH_ENDPOINTS_INSPECTOR_KEY } from './inspect-path-endpoints';

const registry = createDefaultInspectorRegistry([PATH_ENDPOINTS_INSPECTOR]);

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
      request={[
        { inspector: STROKE_PATH_INSPECTOR_KEY, value: { labels: false } },
        { inspector: PATH_ENDPOINTS_INSPECTOR_KEY, value: true },
      ]}
      stroke="dimgray"
      strokeWidth={3}
    >
      {steps}
    </InspectPath>
  ) : (
    <Path stroke="dimgray" strokeWidth={3}>
      {steps}
    </Path>
  );
};

/** 在同一个 registry 中组合内置控制点与第三方端点 Inspector */
const Demo: FC = () => (
  <InspectLayout registry={registry} width={420} height={220} viewBox={{ x: -210, y: -110, width: 420, height: 220 }}>
    <Curve inspect />
  </InspectLayout>
);

/** 源码派生只保留持久化图形，不把 Inspector selection 写入 IR */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout width={420} height={220} viewBox={{ x: -210, y: -110, width: 420, height: 220 }}>
      <Curve />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
