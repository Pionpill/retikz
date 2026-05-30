import { type ReactElement } from 'react';
import type { ArrowEndSpec, Scene, SceneResource } from '@retikz/core';
import { buildSvgDocument, renderToSvgString } from '@retikz/svg';
import { describe, expect, it } from 'vitest';
import { svgToReact } from '../src/render/svgToReact';

type AnyElement = ReactElement<Record<string, unknown> & { children?: unknown }>;

const arrowSpec: ArrowEndSpec = {
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

const resources: Array<SceneResource> = [
  {
    kind: 'paint',
    id: 'paint-1',
    spec: {
      type: 'linearGradient',
      stops: [
        { offset: 0, color: '#123' },
        { offset: 1, color: '#fed', opacity: 0.8 },
      ],
    },
  },
  {
    kind: 'clip',
    id: 'clip-1',
    shape: { kind: 'rect', x: 0, y: 0, width: 16, height: 12 },
  },
];

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

const elementChildren = (element: AnyElement): Array<AnyElement> =>
  (element.props.children as Array<AnyElement> | undefined) ?? [];

const findChild = (element: AnyElement, type: string): AnyElement => {
  const child = elementChildren(element).find(c => c.type === type);
  expect(child).toBeDefined();
  return child as AnyElement;
};

describe('string-react-parity', () => {
  it('字符串序列化与 React 映射保持同一份 SVG 语义', () => {
    const idPrefix = 'parity';
    const svgString = renderToSvgString(scene, { idPrefix });
    const svgElement = svgToReact(buildSvgDocument(scene, { idPrefix })) as AnyElement;

    expect(svgString).toContain('viewBox="0 0 20 20"');
    expect(svgElement.props.viewBox).toBe('0 0 20 20');

    expect(svgString).toContain('stroke-width="2"');
    expect(svgString).toContain('style="fill:var(--brand);stroke:var(--outline)"');
    const varRect = findChild(svgElement, 'rect');
    expect(varRect.props.strokeWidth).toBe(2);
    expect(varRect.props.fill).toBeUndefined();
    expect(varRect.props.stroke).toBeUndefined();
    expect(varRect.props.style).toEqual({ fill: 'var(--brand)', stroke: 'var(--outline)' });

    const defs = findChild(svgElement, 'defs');
    const defsChildren = elementChildren(defs);
    const marker = defsChildren.find(c => c.type === 'marker');
    const gradient = defsChildren.find(c => c.type === 'linearGradient');
    const clipPath = defsChildren.find(c => c.type === 'clipPath');
    expect(marker).toBeDefined();
    expect(gradient?.props.id).toBe('retikz-paint-parity-paint-1');
    expect(clipPath?.props.id).toBe('retikz-clip-parity-clip-1');
    expect(svgString).toContain('id="retikz-paint-parity-paint-1"');
    expect(svgString).toContain('id="retikz-clip-parity-clip-1"');

    const group = findChild(svgElement, 'g');
    expect(group.props.clipPath).toBe('url(#retikz-clip-parity-clip-1)');
    expect(svgString).toContain('clip-path="url(#retikz-clip-parity-clip-1)"');
    const paintedRect = elementChildren(group)[0];
    expect(paintedRect.props.fill).toBe('url(#retikz-paint-parity-paint-1)');
    expect(svgString).toContain('fill="url(#retikz-paint-parity-paint-1)"');

    const path = findChild(svgElement, 'path');
    const markerUrl = `url(#${String(marker?.props.id)})`;
    expect(path.props.markerStart).toBe(markerUrl);
    expect(path.props.markerEnd).toBe(markerUrl);
    expect(svgString).toContain(`marker-start="${markerUrl}"`);
    expect(svgString).toContain(`marker-end="${markerUrl}"`);
  });
});
