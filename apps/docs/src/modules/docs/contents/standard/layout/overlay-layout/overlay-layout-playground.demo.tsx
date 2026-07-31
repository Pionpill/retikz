import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LayoutItem, OverlayLayout } from '@retikz/standard-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { overlayLayoutPlaygroundControls, previewControlContract } from './overlay-layout-playground.controls';

export const previewControls = overlayLayoutPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const anchor =
    values.anchor === 'top-left' ? { x: 0, y: 0 } : values.anchor === 'top-right' ? { x: 1, y: 0 } : { x: 0.5, y: 0.5 };

  return (
    <Layout
      width={440}
      height={250}
      viewBox={{ x: 0, y: 0, width: 440, height: 250 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <OverlayLayout
        inspect={values.inspect}
        size={{ x: { kind: 'fixed', value: 350 }, y: { kind: 'fixed', value: 170 } }}
        padding={12}
        justifyItems={values.justifyItems}
        alignItems={values.alignItems}
      >
        <LayoutItem kind="overlay" itemKey="base" zIndex={0}>
          <Node
            position={[0, 0]}
            text="BASE"
            minimumSize={{ width: 220, height: 88 }}
            fill="#dbeafe"
            stroke="#2563eb"
          />
        </LayoutItem>
        <LayoutItem kind="overlay" itemKey="middle" zIndex={1} offset={{ x: 24, y: 20 }}>
          <Node
            position={[0, 0]}
            text="LAYER"
            minimumSize={{ width: 128, height: 50 }}
            fill="#dcfce7"
            stroke="#16a34a"
          />
        </LayoutItem>
        <LayoutItem
          kind="overlay"
          itemKey="badge"
          placement={{ kind: 'positioned', at: { x: values.badgeX, y: values.badgeY }, anchor }}
          sizeParticipation="exclude"
          zIndex={values.zIndex}
        >
          <Node position={[0, 0]} text="3" shape="circle" minimumSize={44} fill="#fee2e2" stroke="#dc2626" />
        </LayoutItem>
      </OverlayLayout>
    </Layout>
  );
});

export const previewSource = controlledPreview.source;

/** OverlayLayout alignment、positioning 与 zIndex playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
