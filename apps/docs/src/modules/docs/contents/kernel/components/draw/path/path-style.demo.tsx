import type { FC } from 'react';

import { Layout, Path, Step } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { pathStyleControls } from './path-style.controls';

export const previewControls = pathStyleControls;

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;

/** Path 描边与透明度 playground */
const Demo: FC = () => {
  const values = usePreviewControls(pathStyleControls);
  const thickness = values.thickness === 'custom' ? undefined : values.thickness;

  return (
    <Layout width={400} height={218} viewBox={{ x: -220, y: -120, width: 440, height: 240 }}>
      <Path
        stroke={values.stroke}
        strokeWidth={values.thickness === 'custom' ? values.strokeWidth : undefined}
        thickness={thickness}
        dashPattern={values.dashed ? [18, 10] : undefined}
        dashOffset={values.dashOffset}
        lineCap={values.lineCap}
        lineJoin={values.lineJoin}
        opacity={values.opacity}
        strokeOpacity={values.strokeOpacity}
      >
        <Step kind="move" to={[-175, 55]} />
        <Step to={[-80, -60]} />
        <Step to={[15, 45]} />
        <Step to={[110, -50]} />
        <Step to={[175, 35]} />
      </Path>
      <Path fill="#ffb703" opacity={values.opacity} fillOpacity={values.fillOpacity} stroke="none">
        <Step kind="move" to={[-45, 90]} />
        <Step to={[0, 55]} />
        <Step to={[45, 90]} />
        <Step kind="cycle" />
      </Path>
    </Layout>
  );
};

export default Demo;
