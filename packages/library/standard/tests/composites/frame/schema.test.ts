import { describe, expect, it } from 'vitest';

import { FrameDescriptionSchema, FrameHeaderDirection, FrameSchema, FrameTitleSchema } from '../../../src/presentation';
import { resolveFrame } from '../../../src/presentation/frame/resolve';
import { fullScopeProps } from '../presentation/scope-props';

const node = { type: 'node', position: [0, 0], text: 'A' } as const;

describe('FrameSchema', () => {
  it('重用完整的 Core Scope 编写的曲面，同时保持边界字段嵌套', () => {
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

  it('保持 Source 稀疏并解决稳定的边框、填充和头部默认值', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      children: [node],
    });

    const canonical = resolveFrame(parsed);

    expect(parsed.padding).toBe(8);
    expect(canonical).toMatchObject({
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
      gap: 4,
      headerDirection: FrameHeaderDirection.Horizontal,
      border: { style: { stroke: 'currentColor', strokeWidth: 1 } },
      localNamespace: false,
      boundingShape: 'rectangle',
    });
    expect(canonical.border.cornerRadius).toBeUndefined();
    expect(FrameSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(FrameSchema.parse({ namespace: 'standard', type: 'frame', children: [node] })).not.toHaveProperty('id');
  });

  it('重用已关闭的 Node 契约作为标题和描述，而不接受仓位', () => {
    const title = FrameTitleSchema.parse({
      id: 'heading',
      text: 'Contract',
      shape: 'circle',
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
      style: { font: { family: 'serif' } },
      layout: { padding: { x: 4, top: 2 } },
    });
    const description = FrameDescriptionSchema.parse({
      text: '',
      style: { opacity: 0.5 },
    });

    expect(title).toMatchObject({
      id: 'heading',
      text: 'Contract',
      shape: 'circle',
      meta: { role: 'title' },
      style: { font: { family: 'serif' } },
    });
    expect(description.text).toBe('');
    expect(FrameTitleSchema.safeParse({ text: 'invalid', position: [0, 0] }).success).toBe(false);
    expect(
      FrameDescriptionSchema.safeParse({
        style: { opacity: 0.5 },
      }).success,
    ).toBe(false);
  });

  it('将根 Scope 样式与嵌套边框 Path 样式分开', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      padding: { default: 6, x: 8, top: 10 },
      gap: 0,
      headerDirection: FrameHeaderDirection.Vertical,
      border: { style: { stroke: '#334155', fill: '#f8fafc', zIndex: -3 }, cornerRadius: 6 },
      zIndex: 3,
      title: { text: 'Group' },
      description: { text: 'Details', layout: { maxTextWidth: 160 } },
      children: [node],
      defaults: { style: { fill: '#fff', opacity: 0.8 } },
    });

    expect(parsed).toMatchObject({
      padding: { default: 6, x: 8, top: 10 },
      gap: 0,
      headerDirection: 'vertical',
      border: { style: { stroke: '#334155', fill: '#f8fafc', zIndex: -3 }, cornerRadius: 6 },
      zIndex: 3,
      title: { text: 'Group' },
      description: { text: 'Details', layout: { maxTextWidth: 160 } },
      defaults: { style: { fill: '#fff', opacity: 0.8 } },
    });
  });

  it('精确拒绝空正文、缺少标题文本、无效间距和未知嵌套字段', () => {
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

  it('仅保留显式根 ID 并允许以前生成的后缀', () => {
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
