import type { CompiledNodeLayout, GroupPrim, PathPrim, ScenePrimitive } from '@retikz/core';

import { compileToScene, isNodeLayoutCompileArtifact, rect as rectOps } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FrameInput } from '../../../src';

import { createFrame, FrameDefinition, FrameHeaderDirection } from '../../../src';
import { fullScopeProps } from '../presentation/scope-props';

const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<GroupPrim> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

const pathsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<PathPrim> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? pathsOf(primitive.children) : primitive.type === 'path' ? [primitive] : [],
  );

const compileFrameScene = (input: FrameInput, nodeLayouts = false) =>
  compileToScene(
    { type: 'scene', version: 1, children: [createFrame(input)] },
    {
      composites: [FrameDefinition],
      padding: 0,
      ...(nodeLayouts ? { artifacts: { nodeLayouts: true } } : {}),
    },
  );

const nodeLayoutsById = (result: ReturnType<typeof compileFrameScene>): Map<string, CompiledNodeLayout> => {
  const layouts = new Map<string, CompiledNodeLayout>();
  for (const artifact of result.artifacts) {
    if (isNodeLayoutCompileArtifact(artifact) && artifact.value.id !== undefined) {
      layouts.set(artifact.value.id, artifact.value);
    }
  }
  return layouts;
};

const body = { type: 'node' as const, position: [40, 50] as [number, number], text: 'Body' };

describe('Frame layout compile', () => {
  it('compiles an anonymous Frame without synthesizing root, body, or header ids', () => {
    const result = compileFrameScene(
      { title: { text: 'Title' }, description: { text: 'Description' }, children: [body] },
      true,
    );

    expect(groupsOf(result.scene.primitives).every(group => group.id === undefined)).toBe(true);
    expect(
      result.artifacts.filter(isNodeLayoutCompileArtifact).every(artifact => artifact.value.id === undefined),
    ).toBe(true);
    expect(JSON.stringify(result.scene)).not.toMatch(/\/content|\/title|\/description/);
  });

  it('preserves explicit root, body, and header ids without deriving structural suffixes', () => {
    const result = compileFrameScene(
      {
        id: 'frame-root',
        title: { id: 'heading', text: 'Title' },
        description: { id: 'summary', text: 'Description' },
        children: [{ ...body, id: 'body' }],
      },
      true,
    );
    const ids = groupsOf(result.scene.primitives).flatMap(group => (group.id === undefined ? [] : [group.id]));

    expect(ids).toEqual(expect.arrayContaining(['frame-root', 'body', 'heading', 'summary']));
    expect(ids).not.toEqual(
      expect.arrayContaining(['frame-root/content', 'frame-root/title', 'frame-root/description']),
    );
    expect([...nodeLayoutsById(result).keys()]).toEqual(expect.arrayContaining(['body', 'heading', 'summary']));
  });

  it('keeps authored Scope properties on the root and border style on the border Path', () => {
    const result = compileFrameScene({
      ...fullScopeProps,
      id: 'frame-root',
      stroke: '#0f172a',
      border: { style: { stroke: '#0284c7', strokeWidth: 2, fill: '#e0f2fe' }, cornerRadius: 4 },
      children: [{ ...body, id: 'body' }],
    });
    const root = groupsOf(result.scene.primitives).find(group => group.id === 'frame-root');
    const border = pathsOf(root?.children ?? [])[0];

    expect(root).toMatchObject({ id: 'frame-root', meta: { source: 'scope-props-test' } });
    expect(root?.animations).toHaveLength(1);
    expect(root?.transforms).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'translate' })]));
    expect(border).toMatchObject({ stroke: '#0284c7', strokeWidth: 2, fill: '#e0f2fe' });
    expect(border.commands.some(command => command.kind === 'arc')).toBe(true);
  });

  it('places horizontal headers above the body from actual Node layouts', () => {
    const result = compileFrameScene(
      {
        gap: 5,
        title: { id: 'title', text: 'A long title', padding: 3, scale: 1.2 },
        description: { id: 'description', text: 'Description' },
        children: [{ ...body, id: 'body' }],
      },
      true,
    );
    const layouts = nodeLayoutsById(result);
    const bodyLayout = layouts.get('body');
    const title = layouts.get('title');
    const description = layouts.get('description');
    if (!bodyLayout || !title || !description) throw new Error('Expected Frame Node layouts');

    const bodyTopLeft = rectOps.anchor(bodyLayout.rect, 'top-left');
    const titleBottomLeft = rectOps.anchor(title.rect, 'bottom-left');
    const titleBottomRight = rectOps.anchor(title.rect, 'bottom-right');
    const descriptionBottomLeft = rectOps.anchor(description.rect, 'bottom-left');
    expect(titleBottomLeft[0]).toBeCloseTo(bodyTopLeft[0], 8);
    expect(titleBottomLeft[1]).toBeCloseTo(bodyTopLeft[1] - 5, 8);
    expect(descriptionBottomLeft[0]).toBeCloseTo(titleBottomRight[0] + 5, 8);
    expect(descriptionBottomLeft[1]).toBeCloseTo(titleBottomRight[1], 8);
  });

  it('places vertical headers in title, description, body reading order', () => {
    const result = compileFrameScene(
      {
        gap: 6,
        headerDirection: FrameHeaderDirection.Vertical,
        title: { id: 'title', text: 'Title' },
        description: { id: 'description', text: 'Description' },
        children: [{ ...body, id: 'body' }],
      },
      true,
    );
    const layouts = nodeLayoutsById(result);
    const bodyLayout = layouts.get('body');
    const title = layouts.get('title');
    const description = layouts.get('description');
    if (!bodyLayout || !title || !description) throw new Error('Expected Frame Node layouts');

    const bodyTopLeft = rectOps.anchor(bodyLayout.rect, 'top-left');
    const descriptionBottomLeft = rectOps.anchor(description.rect, 'bottom-left');
    const descriptionTopLeft = rectOps.anchor(description.rect, 'top-left');
    const titleBottomLeft = rectOps.anchor(title.rect, 'bottom-left');
    expect(descriptionBottomLeft).toEqual([bodyTopLeft[0], bodyTopLeft[1] - 6]);
    expect(titleBottomLeft).toEqual([descriptionTopLeft[0], descriptionTopLeft[1] - 6]);
  });

  it('merges header defaults with explicit Node fields while preserving explicit ids', () => {
    const result = compileFrameScene({
      title: {
        id: 'custom-title',
        text: 'Contract',
        shape: 'circle',
        stroke: '#334155',
        fill: '#f8fafc',
        padding: 5,
        font: { family: 'serif' },
      },
      children: [body],
    });
    const title = groupsOf(result.scene.primitives).find(group => group.id === 'custom-title');
    const titleShape = title?.children.find(child => child.type === 'ellipse');
    const titleText = title?.children.find(child => child.type === 'text');

    expect(titleShape).toMatchObject({ stroke: '#334155', fill: '#f8fafc' });
    expect(titleText).toMatchObject({ fontFamily: 'serif', fontSize: 14, fontWeight: 600 });
    if (titleText?.type === 'text') expect(titleText.lines[0]?.text).toBe('Contract');
  });

  it('adds resolved padding to allocation and emits corner arcs only for a positive radius', () => {
    const plain = compileFrameScene({ padding: 0, children: [body] });
    const padded = compileFrameScene({
      padding: { default: 3, x: 4, y: 5, left: 6, bottom: 7 },
      border: { cornerRadius: 6 },
      children: [body],
    });
    const sharp = compileFrameScene({ padding: 0, border: { cornerRadius: 0 }, children: [body] });

    expect(padded.scene.layout.width).toBeCloseTo(plain.scene.layout.width + 10, 8);
    expect(padded.scene.layout.height).toBeCloseTo(plain.scene.layout.height + 12, 8);
    expect(pathsOf(padded.scene.primitives)[0]?.commands.some(command => command.kind === 'arc')).toBe(true);
    expect(pathsOf(sharp.scene.primitives)[0]?.commands.some(command => command.kind === 'arc')).toBe(false);
  });

  it('supports one optional header without creating an empty peer or generated identity', () => {
    const titleOnly = compileFrameScene({ title: { id: 'title', text: 'Title' }, children: [body] });
    const descriptionOnly = compileFrameScene({
      description: { id: 'description', text: 'Description' },
      children: [body],
    });

    expect(groupsOf(titleOnly.scene.primitives).flatMap(group => group.id ?? [])).toEqual(['title']);
    expect(groupsOf(descriptionOnly.scene.primitives).flatMap(group => group.id ?? [])).toEqual(['description']);
  });

  it('preserves the missing-definition diagnostic for direct Frame IR', () => {
    const warnings: Array<string> = [];
    compileToScene(
      { type: 'scene', version: 1, children: [createFrame({ id: 'group', children: [body] })] },
      { onWarn: warning => warnings.push(warning.code) },
    );

    expect(warnings).toContain('COMPOSITE_NOT_REGISTERED');
  });
});
