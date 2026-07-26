import type { CompiledNodeLayout, IRNode, IRPath, IRScope } from '@retikz/core';

import { compileToScene, isNodeLayoutCompileArtifact, rect as rectOps } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createFrame, FrameDefinition, FrameHeaderDirection, lowerFrame } from '../../../src';

const children = [
  { type: 'node', id: 'body-a', position: [0, 0], text: 'A' },
  { type: 'node', id: 'body-b', position: [80, 40], text: 'B', shape: 'circle' },
] as const;

describe('lowerFrame', () => {
  it('lowers the default Frame to one bounded Scope with border and content Scope', () => {
    const lowered = lowerFrame(createFrame({ id: 'group', children: [...children] }));

    expect(lowered).toEqual({
      type: 'scope',
      id: 'group',
      localNamespace: false,
      boundingShape: 'rectangle',
      children: [
        {
          type: 'path',
          stroke: 'currentColor',
          strokeWidth: 1,
          zIndex: -1,
          children: [
            {
              type: 'step',
              kind: 'rectangle',
              from: { id: 'group', anchor: 'top-left', offset: [-8, -8] },
              to: { id: 'group', anchor: 'bottom-right', offset: [8, 8] },
            },
          ],
        },
        {
          type: 'scope',
          id: 'group/content',
          localNamespace: false,
          boundingShape: 'rectangle',
          zIndex: 0,
          children: [...children],
        },
      ],
    });
  });

  it('defaults to a horizontal title and description row above the body', () => {
    const lowered = lowerFrame(
      createFrame({
        id: 'group',
        gap: 6,
        title: { text: 'Contract' },
        description: { text: 'One registry' },
        children: [...children],
      }),
    );

    expect(lowered.children[2]).toMatchObject({
      type: 'node',
      id: 'group/title',
      position: {
        kind: 'anchor',
        target: { id: 'group/content', anchor: 'top-left', offset: [0, -6] },
        selfAnchor: 'bottom-left',
      },
    });
    expect(lowered.children[3]).toMatchObject({
      type: 'node',
      id: 'group/description',
      position: {
        kind: 'anchor',
        target: { id: 'group/title', anchor: 'bottom-right', offset: [6, 0] },
        selfAnchor: 'bottom-left',
      },
    });
  });

  it('supports an explicit vertical title, description, and body sequence', () => {
    const lowered = lowerFrame(
      createFrame({
        id: 'group',
        gap: 6,
        headerDirection: FrameHeaderDirection.Vertical,
        title: { text: 'Contract' },
        description: { text: 'One registry' },
        children: [...children],
      }),
    );
    const scope = lowered;

    expect(scope.children[2]).toEqual({
      type: 'node',
      id: 'group/description',
      position: {
        kind: 'anchor',
        target: { id: 'group/content', anchor: 'top-left', offset: [0, -6] },
        selfAnchor: 'bottom-left',
      },
      text: 'One registry',
      shape: 'rectangle',
      stroke: 'none',
      fill: 'none',
      padding: 0,
      font: { size: 'xs' },
      opacity: 0.7,
      zIndex: 1,
    });
    expect(scope.children[3]).toEqual({
      type: 'node',
      id: 'group/title',
      position: {
        kind: 'anchor',
        target: { id: 'group/description', anchor: 'top-left', offset: [0, -6] },
        selfAnchor: 'bottom-left',
      },
      text: 'Contract',
      shape: 'rectangle',
      stroke: 'none',
      fill: 'none',
      padding: 0,
      font: { size: 'sm', weight: 600 },
      zIndex: 1,
    });
  });

  it('preserves explicit Node fields and merges header font defaults field by field', () => {
    const animations = [
      {
        property: 'opacity',
        duration: 200,
        keyframes: [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
      },
    ];
    const lowered = lowerFrame(
      createFrame({
        id: 'group',
        title: {
          id: 'custom-title',
          text: 'Contract',
          shape: 'circle',
          stroke: '#334155',
          fill: '#f8fafc',
          padding: 5,
          font: { family: 'serif' },
          label: { text: 'stable', position: 'right' },
          meta: { role: 'title' },
          animations,
          zIndex: 7,
        },
        children: [...children],
      }),
    );
    const title = lowered.children[2] as IRNode;

    expect(title).toMatchObject({
      type: 'node',
      id: 'custom-title',
      text: 'Contract',
      shape: 'circle',
      stroke: '#334155',
      fill: '#f8fafc',
      padding: 5,
      font: { family: 'serif', size: 'sm', weight: 600 },
      label: { text: 'stable', position: 'right' },
      meta: { role: 'title' },
      animations,
      zIndex: 7,
    });
    expect(title.position).toMatchObject({ target: { id: 'group/content' } });
  });

  it('keeps header defaults when optional overrides are explicitly undefined', () => {
    const lowered = lowerFrame(
      createFrame({
        id: 'group',
        title: {
          text: 'Contract',
          shape: undefined,
          stroke: undefined,
          fill: undefined,
          padding: undefined,
          font: { size: undefined, weight: undefined },
          zIndex: undefined,
        },
        description: {
          text: 'Details',
          shape: undefined,
          stroke: undefined,
          fill: undefined,
          padding: undefined,
          font: { size: undefined },
          opacity: undefined,
          zIndex: undefined,
        },
        children: [...children],
      }),
    );
    const title = lowered.children[2] as IRNode;
    const description = lowered.children[3] as IRNode;

    expect(title).toMatchObject({
      id: 'group/title',
      shape: 'rectangle',
      stroke: 'none',
      fill: 'none',
      padding: 0,
      font: { size: 'sm', weight: 600 },
      zIndex: 1,
    });
    expect(description).toMatchObject({
      id: 'group/description',
      shape: 'rectangle',
      stroke: 'none',
      fill: 'none',
      padding: 0,
      font: { size: 'xs' },
      opacity: 0.7,
      zIndex: 1,
    });
  });

  it('supports title-only and description-only Frames without empty header nodes', () => {
    const titleOnly = lowerFrame(createFrame({ id: 'title-only', title: { text: 'Title' }, children: [...children] }));
    const descriptionOnly = lowerFrame(
      createFrame({ id: 'description-only', description: { text: 'Details' }, children: [...children] }),
    );

    expect(titleOnly.children).toHaveLength(3);
    expect((titleOnly.children[2] as IRNode).id).toBe('title-only/title');
    expect((titleOnly.children[2] as IRNode).position).toMatchObject({
      target: { id: 'title-only/content', offset: [0, -4] },
    });
    expect(descriptionOnly.children).toHaveLength(3);
    expect((descriptionOnly.children[2] as IRNode).id).toBe('description-only/description');
    expect((descriptionOnly.children[2] as IRNode).position).toMatchObject({
      target: { id: 'description-only/content', offset: [0, -4] },
    });
  });

  it('resolves box padding by side, axis, default, and fallback without moving body Nodes', () => {
    const paddingCases = [
      { padding: 5, from: [-5, -5], to: [5, 5] },
      {
        padding: { default: 3, x: 4, y: 5, left: 6, bottom: 7 },
        from: [-6, -5],
        to: [4, 7],
      },
    ] as const;

    paddingCases.forEach(({ padding, from, to }) => {
      const lowered = lowerFrame(createFrame({ id: 'group', padding, children: [...children] }));
      const border = lowered.children[0] as IRPath;
      expect(border.children[0]).toMatchObject({ from: { offset: from }, to: { offset: to } });
      expect((lowered.children[1] as IRScope).children).toEqual(children);
    });
  });

  it('forwards zero and positive corner radius only to the border rectangle step', () => {
    const rounded = lowerFrame(createFrame({ id: 'rounded', cornerRadius: 6, children: [...children] }));
    const sharp = lowerFrame(createFrame({ id: 'sharp', cornerRadius: 0, children: [...children] }));
    const roundedBorder = rounded.children[0] as IRPath;
    const sharpBorder = sharp.children[0] as IRPath;

    expect(roundedBorder).not.toHaveProperty('cornerRadius');
    expect(roundedBorder.children[0]).toMatchObject({ kind: 'rectangle', cornerRadius: 6 });
    expect(sharpBorder.children[0]).toMatchObject({ kind: 'rectangle', cornerRadius: 0 });
    expect(rounded.children.slice(1)).toEqual([
      {
        type: 'scope',
        id: 'rounded/content',
        localNamespace: false,
        boundingShape: 'rectangle',
        zIndex: 0,
        children: [...children],
      },
    ]);
  });

  it('keeps Frame and internal zIndex contracts while preserving explicit header overrides', () => {
    const lowered = lowerFrame(
      createFrame({
        id: 'group',
        zIndex: 9,
        title: { text: 'Title', zIndex: -4 },
        description: { text: 'Description' },
        children: [...children],
      }),
    );

    expect(lowered.zIndex).toBe(9);
    expect(lowered.children.map(child => ('zIndex' in child ? child.zIndex : undefined))).toEqual([-1, 0, -4, 1]);
  });

  it('uses actual header Node layouts and includes them in the padded border without moving body', () => {
    const layouts = new Map<string, CompiledNodeLayout>();
    const result = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          createFrame({
            id: 'group',
            padding: { left: 7, right: 9, top: 11, bottom: 13 },
            gap: 5,
            title: { text: 'A long title', padding: 3, scale: 1.2 },
            description: { text: 'Description', rotate: -5 },
            children: [{ type: 'node', id: 'body', position: [40, 50], text: 'Body' }],
          }),
        ],
      },
      {
        composites: [FrameDefinition],
        artifacts: { nodeLayouts: true },
      },
    );
    const scene = result.scene;
    for (const artifact of result.artifacts) {
      if (isNodeLayoutCompileArtifact(artifact) && artifact.value.id !== undefined) {
        layouts.set(artifact.value.id, artifact.value);
      }
    }

    const body = layouts.get('body');
    const description = layouts.get('group/description');
    const title = layouts.get('group/title');
    expect(body?.content.center).toEqual([40, 50]);
    expect(description).toBeDefined();
    expect(title).toBeDefined();
    if (!body || !description || !title) throw new Error('Expected Frame Node layouts');
    const bodyTopLeft = rectOps.anchor(body.rect, 'top-left');
    const descriptionBottomLeft = rectOps.anchor(description.rect, 'bottom-left');
    const titleBottomLeft = rectOps.anchor(title.rect, 'bottom-left');
    const titleBottomRight = rectOps.anchor(title.rect, 'bottom-right');
    expect(titleBottomLeft[0]).toBeCloseTo(bodyTopLeft[0], 8);
    expect(titleBottomLeft[1]).toBeCloseTo(bodyTopLeft[1] - 5, 8);
    expect(descriptionBottomLeft[0]).toBeCloseTo(titleBottomRight[0] + 5, 8);
    expect(descriptionBottomLeft[1]).toBeCloseTo(titleBottomRight[1], 8);

    const border = scene.primitives
      .flatMap(primitive => (primitive.type === 'group' ? primitive.children : [primitive]))
      .find(primitive => primitive.type === 'path');
    expect(border).toMatchObject({ type: 'path', stroke: 'currentColor', strokeWidth: 1 });
    if (border?.type !== 'path') throw new Error('Expected compiled Frame border path');
    expect(border.commands).toEqual([
      { kind: 'move', to: [7.4, -10.96] },
      { kind: 'line', to: [218.8, -10.96] },
      { kind: 'line', to: [218.8, 80.6] },
      { kind: 'line', to: [7.4, 80.6] },
      { kind: 'close' },
    ]);
  });

  it('preserves the missing-definition diagnostic for direct Frame IR', () => {
    const warnings: Array<string> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [createFrame({ id: 'group', children: [...children] })],
      },
      { onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
