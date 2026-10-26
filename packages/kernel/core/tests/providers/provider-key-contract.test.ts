import { describe, expect, it } from 'vitest';
import { literal, number, object, string, union } from 'zod';

import type { IRScene } from '../../src';
import {
  BUILTIN_PATHS,
  BUILTIN_SHAPES,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineShape,
} from '../../src';

describe('提供者键契约', () => {
  it('形状定义声明其注册表名称', () => {
    const shapeNames = [...BUILTIN_SHAPES.values()].map(def => def.name).sort();

    expect(shapeNames).toContain('rectangle');
    expect(shapeNames).toContain('ellipse');
    expect(new Set(shapeNames).size).toBe(shapeNames.length);
  });

  it('自定义形状使用定义名称而不是记录键', () => {
    const ring = defineShape({
      name: 'ring',
      paramsSchema: object({}),
      computeCircumscribedGeometry: () => ({ halfWidth: 10, halfHeight: 10 }),
      computeBoundaryPoint: rect => [rect.x + rect.width / 2, rect.y],
      resolveAnchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
      emit: () => [{ type: 'ellipse', cx: 0, cy: 0, rx: 10, ry: 10 }],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'ring', position: [0, 0], text: '' }],
    };

    expect(() => compileToScene(ir, { shapes: [ring] }).scene).not.toThrow();
  });

  it('自定义形状不能覆盖内置名称', () => {
    const rectangle = defineShape({
      name: 'rectangle',
      paramsSchema: object({}),
      computeCircumscribedGeometry: () => ({ halfWidth: 1, halfHeight: 1 }),
      computeBoundaryPoint: rect => [rect.x + rect.width / 2, rect.y],
      resolveAnchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
      emit: () => [],
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', shape: 'rectangle', position: [0, 0], text: '' }],
    };

    expect(() => compileToScene(ir, { shapes: [rectangle] }).scene).toThrow(
      /duplicate shape registration: "rectangle"/,
    );
  });

  it('路径类型定义由定义名称作为键控', () => {
    const pathNames = [...BUILTIN_PATHS.values()].map(def => def.name).sort();

    expect(pathNames).toEqual(['stroke']);
  });

  it('复合定义将命名空间和类型声明为提供者键', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: literal('demo'),
      type: literal('badge'),
    });
    const badge = defineComposite({
      namespace: 'demo',
      type: 'badge',
      schema,
      compile: () => ({ children: [{ type: 'node', id: 'badge', position: [0, 0], text: 'B' }] }),
    });
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'demo', type: 'badge' }] };

    expect(() => compileToScene(ir, { composites: [badge] }).scene).not.toThrow();
  });

  it('在解析组件输入时执行 schema 转换并编译转换结果', () => {
    const badge = defineComposite({
      namespace: 'demo',
      type: 'badge',
      schema: CompositeBaseSchema.extend({
        namespace: literal('demo'),
        type: literal('badge'),
        text: string(),
      }).transform(node => ({ ...node, text: node.text.toUpperCase() })),
      compile: node => ({ children: [{ type: 'node', position: [0, 0], text: node.text }] }),
    });
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [{ namespace: 'demo', type: 'badge', text: 'hello' }] },
      { composites: [badge] },
    ).scene;
    const expected = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'HELLO' }],
    }).scene;

    expect(scene).toEqual(expected);
    expect(() =>
      compileToScene(
        { version: 1, type: 'scene', children: [{ namespace: 'demo', type: 'badge', text: 123 }] },
        { composites: [badge] },
      ),
    ).toThrow(/payload validation/);
  });

  it('复合对象联合声明一个共享提供者键', () => {
    const schema = union([
      CompositeBaseSchema.extend({
        namespace: literal('demo'),
        type: literal('badge'),
        variant: literal('text'),
        text: string(),
      }),
      CompositeBaseSchema.extend({
        namespace: literal('demo'),
        type: literal('badge'),
        variant: literal('count'),
        count: number(),
      }),
    ]);
    const badge = defineComposite({
      namespace: 'demo',
      type: 'badge',
      schema,
      compile: node => ({
        children: [
          {
            type: 'node',
            position: [0, 0],
            text: node.variant === 'text' ? node.text : String(node.count),
          },
        ],
      }),
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'demo', type: 'badge', variant: 'text', text: 'A' },
        { namespace: 'demo', type: 'badge', variant: 'count', count: 2 },
      ],
    };

    expect(() => compileToScene(ir, { composites: [badge] }).scene).not.toThrow();
  });
});
