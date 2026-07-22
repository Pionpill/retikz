import type { IRPath, IRScope } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createFrame, FrameDefinition, lowerFrame } from '../../../src';

const children = [
  { type: 'node', position: [0, 0], text: 'A' },
  { type: 'node', position: [80, 40], text: 'B', shape: 'circle' },
] as const;

describe('lowerFrame', () => {
  it('lowers to a bounded border, content Scope, and fixed horizontal label carrier', () => {
    const lowered = lowerFrame(
      createFrame({
        id: 'group',
        gap: 10,
        border: { dashPattern: [4, 2] },
        label: 'Contract',
        children: [...children],
      }),
    );

    expect(lowered).toHaveLength(3);
    expect(lowered[0]).toEqual({
      type: 'path',
      stroke: 'currentColor',
      strokeWidth: 1,
      dashPattern: [4, 2],
      zIndex: -1,
      children: [
        {
          type: 'step',
          kind: 'rectangle',
          from: { id: 'group', anchor: 'top-left', offset: [-10, -10] },
          to: { id: 'group', anchor: 'bottom-right', offset: [10, 10] },
        },
      ],
    });
    expect(lowered[1]).toEqual({
      type: 'scope',
      id: 'group',
      localNamespace: false,
      boundingShape: 'rectangle',
      zIndex: 0,
      children: [...children],
    });
    expect(lowered[2]).toEqual({
      type: 'path',
      stroke: 'transparent',
      strokeWidth: 0,
      zIndex: 1,
      children: [
        { type: 'step', kind: 'move', to: { id: 'group', anchor: 'top-left', offset: [10, -8] } },
        {
          type: 'step',
          kind: 'line',
          to: { id: 'group', anchor: 'top-left', offset: [11, -8] },
          label: {
            text: 'Contract',
            position: 'at-start',
            side: 'right',
            distance: 0,
            textColor: 'currentColor',
          },
        },
      ],
    });
  });

  it('keeps zero gap, custom border zIndex, and children unchanged without a label carrier', () => {
    const input = createFrame({
      id: 'group',
      gap: 0,
      border: { fill: '#fff', dashPattern: [2, 1], zIndex: -3 },
      children: [...children],
    });
    const lowered = lowerFrame(input);

    expect(lowered).toHaveLength(2);
    expect(lowered[0]).toMatchObject({ fill: '#fff', dashPattern: [2, 1], zIndex: -3 });
    const border = lowered[0] as IRPath;
    expect(border.children[0]).toMatchObject({ from: { offset: [0, 0] }, to: { offset: [0, 0] } });
    expect((lowered[1] as IRScope).children).toEqual(input.children);
  });

  it('resolves the border to the precise Scope bounds including gap and child shapes', () => {
    const warnings: Array<string> = [];
    const scene = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createFrame({ id: 'group', gap: 6, children: [...children] })],
      },
      { composites: [FrameDefinition], onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).not.toContain('UNRESOLVED_NODE_REFERENCE');
    const border = scene.primitives.find(primitive => primitive.type === 'path');
    expect(border).toMatchObject({ type: 'path', stroke: 'currentColor', strokeWidth: 1 });
    if (!border) throw new Error('Expected compiled Frame border path');
    expect(border.commands).toEqual([
      { kind: 'move', to: [-18.4, -23.6] },
      { kind: 'line', to: [107.53, -23.6] },
      { kind: 'line', to: [107.53, 67.53] },
      { kind: 'line', to: [-18.4, 67.53] },
      { kind: 'close' },
    ]);
  });

  it('keeps a long label outside Scope bounds', () => {
    const compileFrame = (label?: string) =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [createFrame({ id: 'group', gap: 6, label, children: [...children] })],
        },
        { composites: [FrameDefinition] },
      );
    const unlabeledBorder = compileFrame().primitives.find(primitive => primitive.type === 'path');
    const labeledBorder = compileFrame('A very long label that must not affect bounds').primitives.find(
      primitive => primitive.type === 'path' && primitive.stroke === 'currentColor',
    );

    expect(labeledBorder).toEqual(unlabeledBorder);
  });

  it('keeps Core diagnostics for duplicate ids and direct Frame IR without its definition', () => {
    const duplicateWarnings: Array<string> = [];
    const missingWarnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createFrame({ id: 'same', children: [{ type: 'node', id: 'same', position: [0, 0] }] })],
      },
      { composites: [FrameDefinition], onWarn: warning => duplicateWarnings.push(warning.code) },
    );
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createFrame({ id: 'group', children: [{ type: 'node', position: [0, 0] }] }),
          { type: 'node', position: [4, 4], text: 'kept' },
        ],
      },
      { onWarn: warning => missingWarnings.push(warning.code) },
    );

    expect(duplicateWarnings).toContain('DUPLICATE_NODE_ID');
    expect(missingWarnings).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
