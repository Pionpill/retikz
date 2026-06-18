import { createElement, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';
import { TexNode, type TexNodeProps } from '../src/react';

const renderTexNode = (props: TexNodeProps) => TexNode(props);

const expectTexNode = (props: TexNodeProps) => {
  const node = renderTexNode(props);
  expect(isValidElement(node)).toBe(true);
  if (!isValidElement(node)) throw new Error('expected React element');
  expect((node.type as { displayName?: string }).displayName).toBe('@retikz/Node');
  return node.props as Record<string, unknown>;
};

describe('[react] <TexNode> formula component', () => {
  it('maps the tex prop to IR node.tex', () => {
    const props = expectTexNode({ position: [0, 0], tex: 'E=mc^2' });
    expect(props).toMatchObject({
      position: [0, 0],
      tex: { tex: 'E=mc^2' },
    });
  });

  it('maps string children to IR node.tex', () => {
    const props = expectTexNode({ position: [0, 0], displayMode: true, children: '\\frac{a}{b}' });
    expect(props).toMatchObject({
      tex: { tex: '\\frac{a}{b}', displayMode: true },
    });
  });

  it('passes through Node positioning, shape, and style fields', () => {
    const props = expectTexNode({
      id: 'eq',
      position: [10, 20],
      tex: 'x^2',
      shape: 'rectangle',
      fill: '#eef2ff',
      stroke: '#4f46e5',
      padding: 12,
    });
    expect(props).toMatchObject({
      id: 'eq',
      position: [10, 20],
      shape: 'rectangle',
      fill: '#eef2ff',
      stroke: '#4f46e5',
      padding: 12,
      tex: { tex: 'x^2' },
    });
  });

  it('can be used as a regular React component before sugar expansion', () => {
    const node = createElement(TexNode, { position: [0, 0], tex: 'x' });
    expect(node.type).toBe(TexNode);
  });
});
