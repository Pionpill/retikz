import type { FC } from 'react';

import { createDefaultInspectorRegistry, STROKE_PATH_INSPECTOR_KEY } from '@retikz/inspect';
import { InspectLayout, InspectPath } from '@retikz/inspect/react';
import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

const registry = createDefaultInspectorRegistry();

const Curve: FC<{ inspect?: boolean }> = props => {
  const { inspect = false } = props;
  const children = (
    <>
      <Step kind="move" to={[-130, 35]} />
      <Step kind="cubic" control1={[-70, -80]} control2={[75, 90]} to={[130, -30]} />
    </>
  );

  return inspect ? (
    <InspectPath
      request={{
        inspector: STROKE_PATH_INSPECTOR_KEY,
        options: { controlPoints: true, labels: true },
      }}
      stroke="dodgerblue"
      strokeWidth={3}
    >
      {children}
    </InspectPath>
  ) : (
    <Path stroke="dodgerblue" strokeWidth={3}>
      {children}
    </Path>
  );
};

/** 使用内置 Path Inspector 显示三次贝塞尔控制点 */
const Demo: FC = () => (
  <InspectLayout registry={registry} width={360} height={180} viewBox={{ x: -180, y: -90, width: 360, height: 180 }}>
    <Curve inspect />
  </InspectLayout>
);

/** 源码面板只从持久化图形派生 IR，不包含运行时 Inspector 选择 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => (
    <Layout width={360} height={180} viewBox={{ x: -180, y: -90, width: 360, height: 180 }}>
      <Curve />
    </Layout>
  ),
} satisfies PreviewSourceConfig;

export default Demo;
