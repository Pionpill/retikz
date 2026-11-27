import type { PathPrimitive, CompiledArrowEnd, ScenePrimitive } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { SvgNode } from '../../../src/svg';
import { buildPrim } from '../../../src/svg';

/** spec 转 marker id 的回调（按 detail 区分） */
const markerIdFor = (spec: CompiledArrowEnd): string => {
  // 测试用简化 hash：JSON.stringify
  return `mk-${JSON.stringify(spec)}`;
};

/** 构造一个已解析 CompiledArrowEnd（emit-in-compile 后的形态）；marker 颜色用来区分不同 detail */
const resolvedSpec = (shape: string, fill?: string): CompiledArrowEnd => {
  const path: ScenePrimitive = {
    type: 'path',
    commands: [{ kind: 'move', to: [0, 0] }],
    ...(fill !== undefined ? { fill } : {}),
  };
  return { shape, baseSize: 10, refX: 0, markerWidth: 6, markerHeight: 6, marker: [path] };
};

describe('buildPrim path: arrowStart / arrowEnd 是 CompiledArrowEnd', () => {
  const base: PathPrimitive = {
    type: 'path',
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 10] },
    ],
    stroke: '#000',
    strokeWidth: 1,
  };

  it('传已解析 spec 时 markerEnd id 反映 detail', () => {
    const spec = resolvedSpec('normal');
    const el = buildPrim({ ...base, arrowEnd: spec }, { arrowMarkerIdFor: markerIdFor });

    expect(el.attrs['marker-end']).toBe(`url(#${markerIdFor(spec)})`);
  });

  it('start / end 不同 detail → markerStart / markerEnd 不同 url', () => {
    const startSpec = resolvedSpec('normal', 'red');
    const endSpec = resolvedSpec('stealth', 'blue');
    const el = buildPrim(
      { ...base, arrowStart: startSpec, arrowEnd: endSpec },
      {
        arrowMarkerIdFor: markerIdFor,
      },
    );

    expect(el.attrs['marker-start']).not.toBe(el.attrs['marker-end']);
    expect(el.attrs['marker-start']).toBe(`url(#${markerIdFor(startSpec)})`);
    expect(el.attrs['marker-end']).toBe(`url(#${markerIdFor(endSpec)})`);
  });

  it('ctx.arrowMarkerIdFor 缺省 → markerEnd 静默 undefined（与旧行为一致）', () => {
    const el = buildPrim({ ...base, arrowEnd: resolvedSpec('normal') });

    expect(el.attrs['marker-end']).toBeUndefined();
  });

  it('起末同 detail → id 完全一致（dedup 复用同一个 defs）', () => {
    const spec = resolvedSpec('stealth', 'red');
    const el = buildPrim({ ...base, arrowStart: spec, arrowEnd: spec }, { arrowMarkerIdFor: markerIdFor });

    expect(el.attrs['marker-start']).toBe(el.attrs['marker-end']);
  });
});

describe('buildPrim path: arrowEnd 字段顺序不影响 id', () => {
  // 这条是 contract test —— hash 应该对字段顺序稳定（即便 JSON.stringify 不保证，实现要排序键）
  // 我们这里用注入的 markerIdFor，所以仅验证 buildPrim 透传 spec 不动；hash 稳定由实际容器 hash 实现保证
  const base: PathPrimitive = {
    type: 'path',
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 10] },
    ],
  };

  it('buildPrim 把 arrowEnd spec 原样喂给 arrowMarkerIdFor', () => {
    let captured: CompiledArrowEnd | undefined;
    const spec = resolvedSpec('stealth', 'red');
    buildPrim(
      { ...base, arrowEnd: spec },
      {
        arrowMarkerIdFor: s => {
          captured = s;
          return 'mk';
        },
      },
    );

    expect(captured).toBe(spec);
  });
});
