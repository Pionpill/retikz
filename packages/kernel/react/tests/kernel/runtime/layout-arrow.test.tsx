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
      fill: 'none',
    },
  ],
});

describe('Layout 箭头样式输出', () => {
  it('实心箭头保留显式填充颜色', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <Path arrow={{ end: { shape: 'normal', color: 'red' } }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </Layout>,
    );

    expect(svg).toMatch(/<path[^>]*fill="red"/);
  });

  it('自定义空心箭头保留定义输出的无填充语义', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100} extensions={{ arrows: [TestOpenArrowDefinition] }}>
        <Path arrow={{ end: { shape: 'testOpen', fill: 'red' } }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </Layout>,
    );

    expect(svg).toMatch(/<path[^>]*fill="none"/);

    expect(svg).not.toContain('fill="red"');
  });

  it('箭头 scale 应用于最终 SVG 变换', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <Path arrow={{ end: { shape: 'normal', scale: 2 } }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </Layout>,
    );

    expect(svg).toContain('scale(1.6 1.6)');
  });
});
