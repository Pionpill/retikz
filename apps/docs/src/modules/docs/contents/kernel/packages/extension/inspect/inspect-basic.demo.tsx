import type { FC } from 'react';

import { createDefaultInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

const registry = createDefaultInspectorRegistry();

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
      request={{
        inspector: STROKE_PATH_INSPECTOR_KEY,
        options: { controlPoints: true, labels: true },
      }}
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

/** 使用内置 stroke Path Inspector 查看最终贝塞尔控制点 */
const Demo: FC = () => (
  <InspectLayout registry={registry} width={420} height={220} viewBox={{ x: -210, y: -110, width: 420, height: 220 }}>
    <Curve inspect />
  </InspectLayout>
);

/** 源码派生只保留持久化图形，Inspector selection 仍是运行时输入 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout width={420} height={220} viewBox={{ x: -210, y: -110, width: 420, height: 220 }}>
      <Curve />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
