import type { IRNode } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import { createSurface, SurfaceSchema } from '../../../src/presentation';
import { resolveSurface } from '../../../src/presentation/surface/resolve';
import { fullScopeProps } from '../presentation/scope-props';

const node: IRNode = {
  type: 'node',
  position: [0, 0],
  layout: { minimumSize: { width: 20, height: 10 } },
};

const surface = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'standard' as const,
  type: 'surface' as const,
  child: node,
  ...overrides,
});

describe('SurfaceSchema', () => {
  it('导出静态 shell 默认值，而不遍历不相关的子契约', () => {
    expect(toJSONSchema(SurfaceSchema.pick({ padding: true, overflow: true, cornerRadius: true }))).toMatchObject({
      properties: { padding: { default: 0 }, overflow: { default: 'visible' }, cornerRadius: { default: 0 } },
    });
  });

  it('在不发明外观的情况下实现静态默认值', () => {
    const source = SurfaceSchema.parse(surface());

    expect(source).toEqual({ ...surface(), position: [0, 0], padding: 0, overflow: 'visible', cornerRadius: 0 });

    const parsed = resolveSurface(source);

    expect(parsed).toEqual({
      namespace: 'standard',
      type: 'surface',
      position: [0, 0],
      child: node,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      overflow: 'visible',
      cornerRadius: 0,
    });
    expect(parsed).not.toHaveProperty('background');
    expect(parsed).not.toHaveProperty('border');
  });

  it('保留填充简写直到域解析', () => {
    expect(resolveSurface(SurfaceSchema.parse(surface({ padding: 6 }))).padding).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 6,
    });
    expect(
      resolveSurface(SurfaceSchema.parse(surface({ padding: { default: 2, x: 4, y: 6, left: 8, top: 10 } }))).padding,
    ).toEqual({
      top: 10,
      right: 4,
      bottom: 6,
      left: 8,
    });
  });

  it('往返默认快照而不扩展简写', () => {
    const source = SurfaceSchema.parse(surface({ padding: { x: 4, top: 6 } }));

    expect(source.padding).toEqual({ x: 4, top: 6 });
    expect(source.overflow).toBe('visible');
    expect(SurfaceSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    expect(resolveSurface(source).padding).toEqual({ top: 6, right: 4, bottom: 0, left: 4 });
  });

  it('接受任何一个 Core 或 Tier-2 子级和往返 Source JSON', () => {
    const tier2 = SurfaceSchema.parse(
      surface({
        child: { namespace: 'third', type: 'card', id: 'card-a', data: { value: 3 } },
      }),
    );

    expect(tier2.child).toEqual({ namespace: 'third', type: 'card', id: 'card-a', data: { value: 3 } });
    expect(SurfaceSchema.parse(JSON.parse(JSON.stringify(tier2)))).toEqual(tier2);
  });

  it('重复使用完整的 Scope props 和封闭的绘制/描边外观', () => {
    const parsed = SurfaceSchema.parse(
      surface({
        ...fullScopeProps,
        background: { fill: '#f8fafc', opacity: { fill: 0.75 } },
        border: { stroke: '#0f172a', strokeWidth: 2, opacity: { stroke: 0.5 } },
        cornerRadius: 8,
        overflow: 'clip',
      }),
    );

    expect(parsed).toMatchObject({
      ...fullScopeProps,
      background: { fill: '#f8fafc', opacity: { fill: 0.75 } },
      border: { stroke: '#0f172a', strokeWidth: 2, opacity: { stroke: 0.5 } },
      cornerRadius: 8,
      overflow: 'clip',
    });
  });

  it('拒绝公共边界处的无效外观、间距、溢出和未知字段', () => {
    const invalid = [
      surface({ padding: -1 }),
      surface({ cornerRadius: -1 }),
      surface({ overflow: 'scroll' }),
      surface({ background: { opacity: { fill: 0.5 } } }),
      surface({ background: { fill: '#fff', opacity: { fill: 2 } } }),
      surface({ border: { stroke: '#000', zIndex: 1 } }),
      surface({ border: { unsupported: true } }),
      surface({ unsupported: true }),
    ];

    expect(invalid.every(input => !SurfaceSchema.safeParse(input).success)).toBe(true);
  });

  it('通过公共工厂创建稀疏 Surface IR', () => {
    expect(createSurface(surface({ padding: 3 }))).toEqual(surface({ padding: 3 }));
    expect({ ...resolveSurface(createSurface(surface({ padding: 3 }))), position: [0, 0] }).toEqual(
      resolveSurface(SurfaceSchema.parse(surface({ padding: 3 }))),
    );
  });
});
