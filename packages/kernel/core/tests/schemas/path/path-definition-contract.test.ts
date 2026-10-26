import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { compileToScene, definePath, PathSchema, resolvePathRegistry, StrokePathSchema } from '../../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

describe('Path 全标的契约', () => {
  it('接受具有任何类型和 JSON 选项的开放路径宿主', () => {
    expect(
      PathSchema.safeParse({
        type: 'path',
        kind: 'custom',
        kindOptions: { nested: { enabled: true } },
        children: steps,
      }).success,
    ).toBe(true);
  });

  it('拒绝删除的顶级功能区字段', () => {
    expect(
      PathSchema.safeParse({
        type: 'path',
        kind: 'custom',
        ribbon: { width: 4 },
        children: steps,
      }).success,
    ).toBe(false);
  });

  it('在内置描边 schema 中保留描边完整主题规则', () => {
    expect(PathSchema.safeParse({ type: 'path', kind: 'stroke' }).success).toBe(true);
    expect(PathSchema.safeParse({ type: 'path', kind: 'stroke', kindOptions: {} }).success).toBe(true);
    expect(StrokePathSchema.safeParse({ type: 'path', children: steps }).success).toBe(true);
    expect(StrokePathSchema.safeParse({ type: 'path', kind: 'stroke', kindOptions: {} }).success).toBe(false);
    expect(StrokePathSchema.safeParse({ type: 'path', kind: 'stroke' }).success).toBe(false);
  });

  it('在编译查找期间解析选定的完整主题 schema', () => {
    expect(() =>
      compileToScene({
        version: 1,
        type: 'scene',
        children: [{ type: 'path', kind: 'stroke' }],
      }),
    ).toThrow(/Stroke paths require `children` steps/);
  });

  it('仅向自定义类型公开域中立路径服务', () => {
    let observed = false;
    const custom = definePath({
      name: 'service-probe',
      schema: PathSchema,
      compile: context => {
        const commands = context.materializePath();
        observed =
          commands.length > 0 &&
          typeof context.materializePath === 'function' &&
          typeof context.emitStroke === 'function' &&
          typeof context.emitHostLabels === 'function' &&
          typeof context.emitBoundaryLabels === 'function' &&
          typeof context.wrapOutput === 'function' &&
          typeof context.round === 'function' &&
          context.path.style?.color === 'red' &&
          context.appearance.color === 'red' &&
          context.appearance.fill === 'blue' &&
          context.appearance.blendMode === 'multiply' &&
          context.appearance.dashPattern !== undefined;

        return null;
      },
    });

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            kind: 'service-probe',
            label: { text: 'host label' },
            marks: [{ pos: 0.5, shape: 'missing-for-materialization' }],
            children: steps,
            style: { color: 'red', fill: 'blue', blendMode: 'multiply', dashPattern: [2, 1] },
          },
        ],
      },
      { paths: [custom] },
    );

    expect(observed).toBe(true);
  });

  it('保持内置描边的有效颜色，直到描边发射', () => {
    const compiled = compileToScene({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: steps,
          style: { color: 'crimson' },
        },
      ],
    }).scene;
    const primitive = compiled.primitives.find(value => value.type === 'path');

    expect(primitive).toMatchObject({ type: 'path', stroke: 'crimson' });
  });

  it('使用 definition.name 作为独立于 schema 形状的注册表项', () => {
    const definition = definePath({
      name: 'named-key',
      schema: PathSchema.extend({ kind: literal('custom') }),
      compile: () => null,
    });

    expect(definition.name).toBe('named-key');
    expect(resolvePathRegistry([definition]).has('named-key')).toBe(true);
  });
});
