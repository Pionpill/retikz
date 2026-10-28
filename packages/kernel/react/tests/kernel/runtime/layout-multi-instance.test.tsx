import { defineArrow } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Layout } from '../../../src/kernel';
import { Path } from '../../../src/kernel';
import { Step } from '../../../src/kernel';

const TestOpenArrowDefinition = defineArrow({
  name: 'testOpen',
  hollow: true,
  backX: 1,
  lineContactX: 1,
  tipX: 9,
  emit: context => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [1, 1] },
        { kind: 'line', to: [9, 5] },
        { kind: 'line', to: [1, 9] },
        { kind: 'close' },
      ],
      stroke: typeof context.stroke === 'string' ? context.stroke : { kind: 'contextStroke' },
      strokeWidth: context.lineWidth,
    },
  ],
});

describe('独立的 Layout 箭头', () => {
  it('两实例不同 spec → 各自独立 marker，不互相串话', () => {
    const svg = renderToStaticMarkup(
      <div>
        <Layout width={100} height={100}>
          <Path arrow={{ end: { shape: 'stealth', color: '#dc2626' } }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[80, 0]} />
          </Path>
        </Layout>
        <Layout width={100} height={100} extensions={{ arrows: [TestOpenArrowDefinition] }}>
          <Path arrow={{ end: { shape: 'testOpen' } }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[80, 0]} />
          </Path>
        </Layout>
      </div>,
    );

    const scenes = svg.match(/<svg[\s\S]*?<\/svg>/g) ?? [];
    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toContain('fill="#dc2626"');
    expect(scenes[1]).not.toContain('#dc2626');
    expect(scenes[1]).toContain('M 1 1 L 9 5 L 1 9 Z');
  });
});
