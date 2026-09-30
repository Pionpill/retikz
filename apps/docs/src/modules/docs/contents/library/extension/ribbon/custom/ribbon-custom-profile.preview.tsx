import { createRibbonPathKindDefinition, defineRibbonWidthProfile } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';
import { z } from 'zod';

const pulseProfile = defineRibbonWidthProfile({
  name: 'pulse',
  paramsSchema: z.strictObject({ base: z.number().nonnegative(), peak: z.number().nonnegative() }),
  widthAt: ({ offset, params }) => params.base + (params.peak - params.base) * Math.sin(Math.PI * offset),
});

const pulseRibbonDefinition = createRibbonPathKindDefinition({ profiles: [pulseProfile] });

/** 控件修改持久化 params，运行时 profile 函数据此计算轮廓 */
export const renderRibbonCustomProfilePreview = (values: { base: number; peak: number }) => (
  <Layout viewBox={{ x: -260, y: -130, width: 520, height: 260 }} extensions={{ pathKinds: [pulseRibbonDefinition] }}>
    <Path
      kind="ribbon"
      kindOptions={{
        width: { kind: 'profile', name: 'pulse', params: { base: values.base, peak: values.peak } },
        sampling: { kind: 'fixed', samples: 41 },
      }}
      style={{ fill: '#60a5fa', stroke: '#1d4ed8' }}
    >
      <Step kind="move" to={[-180, 20]} />
      <Step kind="curve" control={[0, -90]} to={[180, 20]} />
    </Path>
  </Layout>
);
