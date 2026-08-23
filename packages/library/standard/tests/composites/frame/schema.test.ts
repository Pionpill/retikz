import { describe, expect, it } from 'vitest';

import { FrameDescriptionSchema, FrameHeaderDirection, FrameSchema, FrameTitleSchema } from '../../../src';
import { fullScopeProps } from '../presentation/scope-props';

const node = { type: 'node', position: [0, 0], text: 'A' } as const;

describe('FrameSchema', () => {
  it('reuses the complete Core Scope authored surface while keeping border fields nested', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      ...fullScopeProps,
      id: 'frame-root',
      border: { style: { stroke: '#0284c7' }, cornerRadius: 4 },
      children: [node],
    });

    expect(parsed).toMatchObject({ ...fullScopeProps, id: 'frame-root', border: { cornerRadius: 4 } });
    expect(FrameSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('fills stable border, padding, and header gap defaults and round-trips through JSON', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      children: [node],
    });

    expect(parsed).toMatchObject({
      padding: 8,
      gap: 4,
      headerDirection: FrameHeaderDirection.Horizontal,
      border: { style: { stroke: 'currentColor', strokeWidth: 1 } },
      localNamespace: false,
      boundingShape: 'rectangle',
    });
    expect(parsed.border.cornerRadius).toBeUndefined();
    expect(FrameSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(FrameSchema.parse({ namespace: 'standard', type: 'frame', children: [node] })).not.toHaveProperty('id');
  });

  it('reuses the closed Node contract for title and description without accepting position', () => {
    const title = FrameTitleSchema.parse({
      id: 'heading',
      text: 'Contract',
      shape: 'circle',
      font: { family: 'serif' },
      padding: { x: 4, top: 2 },
      label: { text: 'stable', position: 'right' },
      meta: { role: 'title' },
      animations: [
        {
          property: 'opacity',
          duration: 200,
          keyframes: [
            { at: 0, value: 0 },
            { at: 1, value: 1 },
          ],
        },
      ],
    });
    const description = FrameDescriptionSchema.parse({ text: '', opacity: 0.5 });

    expect(title).toMatchObject({
      id: 'heading',
      text: 'Contract',
      shape: 'circle',
      font: { family: 'serif' },
      meta: { role: 'title' },
    });
    expect(description.text).toBe('');
    expect(FrameTitleSchema.safeParse({ text: 'invalid', position: [0, 0] }).success).toBe(false);
    expect(FrameDescriptionSchema.safeParse({ opacity: 0.5 }).success).toBe(false);
  });

  it('separates root Scope styles from the nested border Path style', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      padding: { default: 6, x: 8, top: 10 },
      gap: 0,
      headerDirection: FrameHeaderDirection.Vertical,
      fill: '#fff',
      opacity: 0.8,
      border: { style: { stroke: '#334155', fill: '#f8fafc', zIndex: -3 }, cornerRadius: 6 },
      zIndex: 3,
      title: { text: 'Group' },
      description: { text: 'Details', maxTextWidth: 160 },
      children: [node],
    });

    expect(parsed).toMatchObject({
      padding: { default: 6, x: 8, top: 10 },
      gap: 0,
      headerDirection: 'vertical',
      fill: '#fff',
      opacity: 0.8,
      border: { style: { stroke: '#334155', fill: '#f8fafc', zIndex: -3 }, cornerRadius: 6 },
      zIndex: 3,
      title: { text: 'Group' },
      description: { text: 'Details', maxTextWidth: 160 },
    });
  });

  it('rejects empty body, missing header text, invalid spacing, and unknown nested fields precisely', () => {
    const cases = [
      {
        input: { namespace: 'standard', type: 'frame', id: 'group', children: [] },
        path: ['children'],
      },
      {
        input: { namespace: 'standard', type: 'frame', id: 'group', title: {}, children: [node] },
        path: ['title', 'text'],
      },
      {
        input: { namespace: 'standard', type: 'frame', id: 'group', padding: -1, children: [node] },
        path: ['padding'],
      },
      {
        input: { namespace: 'standard', type: 'frame', id: 'group', gap: -1, children: [node] },
        path: ['gap'],
      },
      {
        input: { namespace: 'standard', type: 'frame', id: 'group', cornerRadius: -1, children: [node] },
        path: [],
      },
      {
        input: { namespace: 'standard', type: 'frame', id: 'group', headerDirection: 'diagonal', children: [node] },
        path: ['headerDirection'],
      },
      {
        input: {
          namespace: 'standard',
          type: 'frame',
          id: 'group',
          border: { style: { unsupported: true } },
          children: [node],
        },
        path: ['border', 'style'],
      },
    ];

    cases.forEach(({ input, path }) => {
      const result = FrameSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.path).toEqual(path);
    });
  });

  it('reserves only the explicit root id and allows former generated suffixes', () => {
    const parts = [
      (id: string) => ({ children: [{ ...node, id }] }),
      (id: string) => ({ children: [node], title: { id, text: 'Title' } }),
      (id: string) => ({ children: [node], description: { id, text: 'Description' } }),
    ];

    parts.forEach(makePart => {
      const result = FrameSchema.safeParse({
        namespace: 'standard',
        type: 'frame',
        id: 'group',
        ...makePart('group'),
      });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0]?.path.at(-1)).toBe('id');
      expect(
        FrameSchema.safeParse({
          namespace: 'standard',
          type: 'frame',
          id: 'group',
          ...makePart('group/content'),
        }).success,
      ).toBe(true);
    });
  });
});
