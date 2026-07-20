import type { FC } from 'react';

import { defineRibbonWidthProfile } from '@retikz/core';
import { Layout, Path, Step } from '@retikz/react';
import { z } from 'zod';

const pulseProfile = defineRibbonWidthProfile({
  name: 'pulse',
  paramsSchema: z.strictObject({
    base: z.number().nonnegative(),
    peak: z.number().nonnegative(),
  }),
  widthAt: ({ offset, params }) => params.base + (params.peak - params.base) * Math.sin(Math.PI * offset),
});

/** 自定义 Ribbon 宽度 profile 的定义、注入与引用闭环 */
const Demo: FC = () => (
  <Layout
    width={400}
    height={180}
    viewBox={{ x: -220, y: -100, width: 440, height: 200 }}
    ribbonWidthProfiles={[pulseProfile]}
  >
    <Path
      kind="ribbon"
      ribbon={{
        width: { kind: 'profile', name: 'pulse', params: { base: 10, peak: 42 } },
        sampling: { kind: 'fixed', samples: 41 },
      }}
      fill="#a78bfa"
      stroke="#6d28d9"
    >
      <Step kind="move" to={[-180, 20]} />
      <Step kind="curve" control={[0, -90]} to={[180, 20]} />
    </Path>
  </Layout>
);

export default Demo;
