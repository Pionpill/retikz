import type { FC } from 'react';

import { DrawWay } from '@retikz/core';
import { Draw, Layout } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { drawFillStackControls } from './draw-fill-stack.controls';

export const previewControls = drawFillStackControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** Draw 闭合填充与栈序 playground */
const Demo: FC = () => {
  const values = usePreviewControls(drawFillStackControls);

  return (
    <Layout width={360} height={260} viewBox={{ x: 0, y: 0, width: 220, height: 190 }}>
      <Draw
        way={[[20, 20], [120, 20], [120, 120], [20, 120], DrawWay.Cycle]}
        fill={values.fillA}
        fillOpacity={values.fillOpacity}
        stroke={values.fillA}
        strokeWidth={2}
        zIndex={values.zIndexA}
      />
      <Draw
        way={[[75, 70], [175, 70], [175, 170], [75, 170], DrawWay.Cycle]}
        fill={values.fillB}
        fillOpacity={values.fillOpacity}
        stroke={values.fillB}
        strokeWidth={2}
      />
    </Layout>
  );
};

export default Demo;
