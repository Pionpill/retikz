import type { IRCoordinate, IRNode, IRScene, TextMeasurer } from '@retikz/core';
import { definePath, PathSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { WeaveManager } from '../../src/weave';
import { compileTestResult } from '../helpers/compilation';

describe('Node 阶段复用', () => {
  it('标签换边保留文字测量，标签文字变化只重新测量该标签', () => {
    const measured: Array<string> = [];
    const measureText: TextMeasurer = (text, font) => {
      measured.push(text);
      return { width: text.length * font.size, height: font.size, ascent: font.size * 0.8, descent: font.size * 0.2 };
    };
    const node: IRNode = {
      type: 'node',
      id: 'body',
      text: 'body',
      label: [{ text: 'label', position: 'top' }],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [node] };
    const options = { measureText };
    const session = new WeaveManager(source, options);
    const mounted = session.mount();
    const moved: IRNode = { ...node, label: [{ text: 'label', position: 'bottom' }] };
    measured.length = 0;
    const move = session.update({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'body' }, input: moved }],
    });
    expect(measured).toEqual([]);
    expect(move.compilation.result).toEqual(compileTestResult({ ...source, children: [moved] }, options));
    move.commit();
    move.finish();
    const renamed: IRNode = { ...moved, label: [{ text: 'renamed', position: 'bottom' }] };
    measured.length = 0;
    const rename = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'body' }, input: renamed },
      ],
    });
    expect(measured).toEqual(['renamed']);
    expect(rename.compilation.result).toEqual(compileTestResult({ ...source, children: [renamed] }, options));
    rename.rollback();
  });

  it('只改变位置保留正文和形状测量，宽度变化仍重新排版', () => {
    let measurements = 0;
    const measureText: TextMeasurer = (text, font) => {
      measurements++;
      return { width: text.length * font.size, height: font.size, ascent: font.size * 0.8, descent: font.size * 0.2 };
    };
    const node: IRNode = { type: 'node', id: 'body', text: 'body content', position: [0, 0] };
    const source: IRScene = { type: 'scene', version: 1, children: [node] };
    const options = { measureText };
    const session = new WeaveManager(source, options);
    const mounted = session.mount();
    const beforeMove = measurements;
    const moved: IRNode = { ...node, position: [50, 30] };
    const move = session.update({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'body' }, input: moved }],
    });
    expect(measurements).toBe(beforeMove);
    expect(move.compilation.result).toEqual(compileTestResult({ ...source, children: [moved] }, options));
    move.commit();
    move.finish();
    const narrower: IRNode = { ...moved, layout: { width: 80 } };
    const beforeResize = measurements;
    const resize = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'body' }, input: narrower },
      ],
    });
    expect(measurements).toBeGreaterThan(beforeResize);
    expect(resize.compilation.result).toEqual(compileTestResult({ ...source, children: [narrower] }, options));
    resize.rollback();
  });

  it('尺寸变化只重算边界消费者，中心锚点结果不变则复用路径', () => {
    const calls = { center: 0, boundary: 0 };
    const paths = (['center', 'boundary'] as const).map(name =>
      definePath({
        name,
        schema: PathSchema.extend({ kind: literal(name) }),
        compile: context => {
          calls[name]++;
          return context.emitStroke();
        },
      }),
    );
    const node: IRNode = { type: 'node', id: 'a', layout: { minimumSize: 40 } };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        node,
        {
          type: 'path',
          kind: 'center',
          children: [
            { type: 'step', kind: 'move', to: { id: 'a', anchor: 'center' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
        {
          type: 'path',
          kind: 'boundary',
          children: [
            { type: 'step', kind: 'move', to: { id: 'a' } },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const session = new WeaveManager(source, { paths });
    const mounted = session.mount();
    const before = { ...calls };
    const resized: IRNode = { ...node, layout: { minimumSize: 80 } };
    const update = session.update({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'a' }, input: resized }],
    });
    expect(calls.center).toBe(before.center);
    expect(calls.boundary).toBe(before.boundary + 1);
    expect(update.compilation.result).toEqual(
      compileTestResult({ ...source, children: [resized, ...source.children.slice(1)] }, { paths }),
    );
    update.rollback();
  });
  it('改色不重复测量正文，并保留后续位置依赖与全量结果一致', () => {
    let measurements = 0;
    const measureText: TextMeasurer = (text, font) => {
      measurements++;
      return { width: text.length * font.size, height: font.size, ascent: font.size * 0.8, descent: font.size * 0.2 };
    };
    const body = {
      type: 'node',
      id: 'body',
      position: { of: 'origin', direction: 'right', distance: 20 },
      text: 'body',
      style: { textColor: 'red' },
    } as const;
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'coordinate', id: 'origin', position: [0, 0] }, body],
    };
    const session = new WeaveManager(source, { measureText });
    const mounted = session.mount();
    const before = measurements;
    const repainted = { ...body, style: { textColor: 'blue' } };
    const paint = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'body' }, input: repainted },
      ],
    });
    expect(measurements).toBe(before);
    expect(paint.compilation.result).toEqual(
      compileTestResult({ ...source, children: [source.children[0], repainted] }, { measureText }),
    );
    paint.commit();
    paint.finish();
    const origin: IRCoordinate = { type: 'coordinate', id: 'origin', position: [50, 0] };
    const beforeMove = measurements;
    const moved = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'origin' }, input: origin },
      ],
    });
    expect(measurements).toBe(beforeMove);
    expect(moved.compilation.result).toEqual(
      compileTestResult({ ...source, children: [origin, repainted] }, { measureText }),
    );
    moved.rollback();
  });
});
