import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Renderer fallback and animation host overrides are separate runtime policies */
const Demo: FC = () => (
  <Layout width={650} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="renderer-policy">
      <LogicFrameTitle>Renderer (fallback only when missing)</LogicFrameTitle>
      <Node
        id="renderer-prop"
        position={[-225, -88]}
        minimumSize={{ width: 96, height: 38 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
      >
        renderer prop
      </Node>
      <Node
        id="renderer-provider"
        position={[-75, -88]}
        minimumSize={{ width: 120, height: 38 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
      >
        Renderer Provider
      </Node>
      <Node
        id="renderer-default"
        position={[80, -88]}
        minimumSize={{ width: 90, height: 38 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
      >
        'svg' default
      </Node>
      <Node
        id="renderer-result"
        position={[235, -88]}
        minimumSize={{ width: 110, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 12, weight: 'bold' }}
      >
        SVG / Canvas
      </Node>
    </LogicFrame>

    <LogicFrame id="animation-policy-group">
      <LogicFrameTitle>Animation (host policy override)</LogicFrameTitle>
      <Node
        id="snapshot-at"
        position={[-220, 0]}
        minimumSize={{ width: 94, height: 38 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
      >
        snapshotAt
      </Node>
      <Node
        id="static-frame"
        position={[230, 0]}
        minimumSize={{ width: 100, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 12, weight: 'bold' }}
      >
        static frame
      </Node>
      <Node
        id="animation-provider"
        text={[
          { text: 'Animation Provider', font: { weight: 'bold' } },
          { text: 'enabled / disabled', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-220, 52]}
        minimumSize={{ width: 132, height: 44 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
        lineHeight={14}
      />
      <Node
        id="animation-policy"
        text={[
          { text: 'Animation policy', font: { weight: 'bold' } },
          { text: 'resolves playback state', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 112]}
        minimumSize={{ width: 124, height: 50 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 12 }}
        lineHeight={14}
      />
      <Node
        id="animation-result"
        position={[230, 112]}
        minimumSize={{ width: 104, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 12, weight: 'bold' }}
      >
        static / playback
      </Node>
      <Node
        id="animate-prop"
        text={[
          { text: 'animate prop', font: { weight: 'bold' } },
          { text: 'no Provider', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-220, 112]}
        minimumSize={{ width: 108, height: 44 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
        lineHeight={13}
      />
      <Node
        id="provider-system"
        text={[
          { text: 'system preference', font: { weight: 'bold' } },
          { text: 'system / default', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 52]}
        minimumSize={{ width: 118, height: 44 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
        lineHeight={13}
      />
    </LogicFrame>

    <Draw way={['renderer-prop', 'renderer-provider']} arrow="->" stroke="gray" />
    <Draw way={['renderer-provider', 'renderer-default']} arrow="->" stroke="gray" />
    <Draw way={['renderer-default', 'renderer-result']} arrow="->" stroke="gray" />
    <Draw way={['snapshot-at', 'static-frame']} arrow="->" stroke="gray" />
    <Draw way={['animation-provider', 'animation-policy']} arrow="->" stroke="gray" />
    <Draw way={['animation-policy', 'animation-result']} arrow="->" stroke="gray" />
    <Draw way={['animate-prop', 'animation-policy']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['provider-system', 'animation-policy']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
