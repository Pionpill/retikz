import { describe, expect, it } from 'vitest';
import { node } from '../src/builder/node';

describe('@retikz/vanilla node()', () => {
  it('node-to-ir：node(id, config) → 正确 IRNode（字段映射）', () => {
    const n = node('a', { position: [0, 0], shape: 'circle', text: 'A', fill: '#f00' });
    expect(n).toEqual({
      type: 'node',
      id: 'a',
      position: [0, 0],
      shape: 'circle',
      text: 'A',
      fill: '#f00',
    });
  });

  it('node-overload：node(config) 匿名（无 id）、node(id, config) 具名', () => {
    const anon = node({ position: [60, 0], text: '匿名' });
    expect(anon).toEqual({ type: 'node', position: [60, 0], text: '匿名' });
    expect('id' in anon).toBe(false);

    const named = node('b', { position: [120, 0], text: 'B' });
    expect(named.type === 'node' && named.id).toBe('b');
  });

  it('node-overload-no-config：node(id) / node() 仅 id / 全空也合法', () => {
    expect(node('c')).toEqual({ type: 'node', id: 'c' });
    expect(node()).toEqual({ type: 'node' });
  });
});
