import { createInputScene, Layout, Node, Scope } from '@retikz/react';
import { normalizeScene, renderToSvgString } from '@retikz/vanilla';
import type { FC } from 'react';

import { RawSvgFrame } from '@/modules/docs/components/component-preview/source-panel/RawSvgFrame';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { roundedRectClip } from './clip-registry.definition';
import vanillaCode from './clip-registry.vanilla.ts?raw';

const Content: FC = () => (
  <>
    <Scope clip={{ kind: 'rounded-rect', x: -150, y: -72, width: 300, height: 144, radius: 36 }}>
      <Node
        position={[-88, -8]}
        shape="circle"
        style={{ fill: 'skyblue', stroke: 'none' }}
        layout={{ minimumSize: { width: 160, height: 160 } }}
      />
      <Node
        position={[84, 8]}
        shape="circle"
        style={{ fill: 'darkorange', stroke: 'none' }}
        layout={{ minimumSize: { width: 170, height: 170 } }}
      />
      <Node
        position={[0, 0]}
        text="custom clip"
        style={{ fill: 'dodgerblue', stroke: 'dodgerblue', strokeWidth: 2, textColor: 'contrast' }}
        layout={{ minimumSize: { width: 132, height: 42 } }}
      />
    </Scope>
    <Node
      position={[0, 80]}
      text="rounded-rect provider"
      style={{ fill: 'none', stroke: 'none', textColor: 'dodgerblue' }}
    />
  </>
);

export const previewSource = {
  deriveIR: false,
  buildViews: ({ theme }) => {
    const authoring = createInputScene(<Content />);
    const input = { ...authoring.scene, ...(theme === undefined ? {} : { theme }) };
    const ir = normalizeScene(input, { adapters: authoring.adapters }).ir;
    const svg = renderToSvgString(input, {
      adapters: authoring.adapters,
      compile: { clips: [roundedRectClip], measureText: browserMeasurer },
    });

    return {
      ir: {
        files: [{ filename: 'clip-registry.ir.json', code: JSON.stringify(ir, null, 2), lang: 'json' as const }],
        render: mode => <Layout ir={ir} renderer={mode} extensions={{ clips: [roundedRectClip] }} />,
      },
      vanilla: {
        files: [{ filename: 'clip-registry.vanilla.ts', code: vanillaCode.trimEnd(), lang: 'ts' as const }],
        rendererMode: 'svg' as const,
        render: () => <RawSvgFrame svg={svg} />,
      },
    };
  },
} satisfies PreviewSourceConfig;

const Demo: FC = () => (
  <Layout extensions={{ clips: [roundedRectClip] }}>
    <Content />
  </Layout>
);

export default Demo;
