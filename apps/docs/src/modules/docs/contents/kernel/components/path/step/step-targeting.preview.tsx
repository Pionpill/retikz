import { Layout, Node, Path, Step } from '@retikz/react';
import type { ReactNode } from 'react';

const targetsOf = (values: StepTargetingPreviewValues): ReactNode => {
  const offset: [number, number] = [values.offsetX, values.offsetY];
  switch (values.targetKind) {
    case 'offset':
      return (
        <>
          <Step to={{ of: 'A', offset }} />
          <Step to={{ of: 'A', offset: [values.offsetX * 2, values.offsetY * 2] }} />
        </>
      );
    case 'relative':
      return (
        <>
          <Step to={{ relative: offset }} />
          <Step to={{ relative: [values.offsetX * 2, values.offsetY * 2] }} />
        </>
      );
    case 'relativeAccumulate':
      return (
        <>
          <Step to={{ relativeAccumulate: offset }} />
          <Step to={{ relativeAccumulate: offset }} />
        </>
      );
  }
};

/** 图形参数 */
export type StepTargetingPreviewValues = {
  targetKind: 'offset' | 'relative' | 'relativeAccumulate';
  offsetX: number;
  offsetY: number;
};

/** 绘制示例图形 */
export const StepTargetingPreview = (values: StepTargetingPreviewValues) => {
  return (
    <Layout viewBox={{ x: -190, y: -120, width: 380, height: 240 }}>
      <Node id="A" position={[-100, 40]} style={{ stroke: 'gray', dashed: true }}>
        a
      </Node>
      <Path arrow="->">
        <Step kind="move" to="A" />
        {targetsOf(values)}
      </Path>
    </Layout>
  );
};
