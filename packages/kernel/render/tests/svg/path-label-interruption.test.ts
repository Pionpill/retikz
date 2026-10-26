import type { IRPath, IRScene } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { renderToSvgString } from '../../src/svg/serialize/to-string';

const STROKE = '#13579b';

const measuredLabel = () => ({ width: 20, height: 10 });

const render = (ir: IRScene): string =>
  renderToSvgString(compileToScene(ir, { measureText: measuredLabel }).scene, { idPrefix: 'label-interruption' });

const closedPath = (extra: Partial<IRPath> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      label: { text: 'close', position: 0.9, sloped: true, gap: 0 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
        { type: 'step', kind: 'line', to: [100, 100] },
        { type: 'step', kind: 'cycle' },
      ],
      ...extra,
      style: { stroke: STROKE, ...extra.style },
    },
  ],
});

describe('SVG 行程 Path 标签中断', () => {
  it.each([
    { gap: undefined, left: 35.5, right: 64.5 },
    { gap: 0, left: 39.5, right: 60.5 },
  ])('将间隙 = $gap 的居中标签序列化为两个不相交的描边路径', ({ gap, left, right }) => {
    const svg = render({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          id: 'edge',
          label: { text: 'gap', sloped: true, gap },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
          style: { stroke: STROKE },
        },
      ],
    });

    expect(svg).toContain(`d="M 0 0 L ${left} 0"`);
    expect(svg).toContain(`d="M ${right} 0 L 100 0"`);
    expect(svg).not.toContain('d="M 0 0 L 100 0"');
  });

  it('在没有 Z 命令的情况下序列化中断的闭合边缘，并保留每个片段的破折号相位', () => {
    const svg = render(closedPath({ style: { dashPattern: [11, 7], dashOffset: 3 } }));

    expect(svg).toContain('d="M 0 0 L 100 0 L 100 100 L 40.35 40.35"');
    expect(svg).toContain('d="M 19.65 19.65 L 0 0"');
    expect(svg).not.toContain('d="M 0 0 L 100 0 L 100 100 Z"');
    expect(svg).toContain('stroke-dashoffset="3"');
    expect(svg).toMatch(/stroke-dashoffset="(?!3")[^"]+"/);
  });

  it('将标记端保留在原始终端可绘制上，而不是关闭边缘片段', () => {
    const svg = render(closedPath({ arrow: { end: {} } }));

    expect(svg).toContain('d="M 0 0 L 100 0 L 100 94.9"');
    expect(svg).toContain('transform="translate(100 94.9) rotate(90)');
    expect(svg).toContain('d="M 100 100 L 40.35 40.35"');
    expect(svg).toContain('d="M 19.65 19.65 L 0 0"');
  });
});
