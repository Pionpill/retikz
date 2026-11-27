import type { CompiledArrowEnd, Scene, SceneResources } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { buildSvgDocument, renderToSvgString } from '../../../src/svg';
import type { SvgNode } from '../../../src/svg';

const arrowSpec: CompiledArrowEnd = {
  shape: 'stealth',
  baseSize: 10,
  refX: 8,
  markerWidth: 6,
  markerHeight: 6,
  marker: [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 5] },
        { kind: 'line', to: [0, 10] },
        { kind: 'close' },
      ],
      fill: { kind: 'contextStroke' },
    },
  ],
};

const resources: SceneResources = {
  paints: [
    {
      kind: 'paint',
      id: 'paint-1',
      spec: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: '#123' },
          { offset: 1, color: '#fed', opacity: 0.8 },
        ],
      },
    },
  ],
  clips: [
    {
      kind: 'clip',
      id: 'clip-1',
      path: {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [16, 0] },
          { kind: 'line', to: [16, 12] },
          { kind: 'line', to: [0, 12] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      },
    },
  ],
};

const scene: Scene = {
  layout: { x: 0, y: 0, width: 20, height: 20 },
  resources,
  primitives: [
    {
      type: 'rect',
      x: 1,
      y: 2,
      width: 8,
      height: 6,
      fill: 'var(--brand)',
      stroke: 'var(--outline)',
      strokeWidth: 2,
      shadow: { offsetX: 1, offsetY: 2, blur: 4, color: '#000', opacity: 0.25 },
    },
    {
      type: 'group',
      clipRef: 'clip-1',
      children: [
        {
          type: 'rect',
          x: 2,
          y: 3,
          width: 4,
          height: 5,
          fill: { kind: 'resourceRef', id: 'paint-1' },
        },
      ],
    },
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 10] },
      ],
      stroke: '#000',
      strokeWidth: 1,
      arrowStart: arrowSpec,
      arrowEnd: arrowSpec,
    },
  ],
};

const elementChildren = (element: SvgNode): Array<SvgNode> => (element.children as Array<SvgNode> | undefined) ?? [];

const findChild = (element: SvgNode, type: string): SvgNode => {
  const child = elementChildren(element).find(c => c.tag === type);

  expect(child).toBeDefined();
  return child as SvgNode;
};

describe('SVG 字符串与描述树等价性', () => {
  it('字符串序列化与描述树保持同一份 SVG 语义', () => {
    const idPrefix = 'parity';
    const svgString = renderToSvgString(scene, { idPrefix });
    const svgElement = buildSvgDocument(scene, { idPrefix });

    expect(svgString).toContain('viewBox="0 0 20 20"');
    expect(svgElement.attrs.viewBox).toBe('0 0 20 20');

    expect(svgString).toContain('stroke-width="2"');
    expect(svgString).toContain('style="fill:var(--brand);stroke:var(--outline)"');

    const varRect = findChild(svgElement, 'rect');

    expect(varRect.attrs['stroke-width']).toBe(2);
    expect(varRect.attrs.fill).toBeUndefined();
    expect(varRect.attrs.stroke).toBeUndefined();
    expect(varRect.style).toEqual({ fill: 'var(--brand)', stroke: 'var(--outline)' });

    const defs = findChild(svgElement, 'defs');
    const defsChildren = elementChildren(defs);
    const gradient = defsChildren.find(c => c.tag === 'linearGradient');
    const clipPath = defsChildren.find(c => c.tag === 'clipPath');
    const filter = defsChildren.find(c => c.tag === 'filter');

    expect(svgString).toContain('scale(');
    expect(gradient?.attrs.id).toBe('retikz-paint-parity-paint-1');
    expect(clipPath?.attrs.id).toBe('retikz-clip-parity-clip-1');
    expect(filter).toBeDefined();
    expect(svgString).toContain('id="retikz-paint-parity-paint-1"');
    expect(svgString).toContain('id="retikz-clip-parity-clip-1"');
    expect(svgString).toContain('flood-color="#000"');
    expect(svgString).toContain('flood-opacity="0.25"');

    const dropShadow = elementChildren(filter as SvgNode)[0];

    expect(dropShadow.tag).toBe('feDropShadow');
    expect(dropShadow.attrs['flood-color']).toBe('#000');
    expect(dropShadow.attrs['flood-opacity']).toBe(0.25);

    const group = findChild(svgElement, 'g');

    expect(group.attrs['clip-path']).toBe('url(#retikz-clip-parity-clip-1)');
    expect(svgString).toContain('clip-path="url(#retikz-clip-parity-clip-1)"');

    const paintedRect = elementChildren(group)[0];

    expect(paintedRect.attrs.fill).toBe('url(#retikz-paint-parity-paint-1)');
    expect(svgString).toContain('fill="url(#retikz-paint-parity-paint-1)"');

    const collectPaths = (element: SvgNode): Array<SvgNode> => [
      ...(element.tag === 'path' ? [element] : []),
      ...elementChildren(element).flatMap(collectPaths),
    ];
    const arrows = collectPaths(svgElement).filter(path => path.attrs.d === 'M 0 0 L 10 5 L 0 10 Z');
    expect(arrows).toHaveLength(2);
    expect(arrows.map(path => path.attrs.fill)).toEqual(['#000', '#000']);
    expect(svgString.match(/d="M 0 0 L 10 5 L 0 10 Z"/g)).toHaveLength(2);
  });
});
