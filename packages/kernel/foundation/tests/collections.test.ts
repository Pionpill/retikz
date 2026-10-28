import { createReadonlyMap } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('createReadonlyMap', () => {
  it('创建冻结的结构快照且不暴露 Map 修改方法', () => {
    const source = new Map<string, number>([
      ['first', 1],
      ['second', 2],
    ]);
    const snapshot = createReadonlyMap(source);

    source.set('third', 3);
    source.delete('first');

    expect([...snapshot]).toEqual([
      ['first', 1],
      ['second', 2],
    ]);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Reflect.get(snapshot, 'set')).toBeUndefined();
    expect(Reflect.get(snapshot, 'delete')).toBeUndefined();
    expect(Reflect.get(snapshot, 'clear')).toBeUndefined();
  });

  it('保留价值身份并将自己暴露为 forEach 所属模块', () => {
    const value = { label: 'value' };
    const snapshot = createReadonlyMap([['key', value] as const]);
    let owner: ReadonlyMap<string, typeof value> | undefined;

    snapshot.forEach((_value, _key, map) => {
      owner = map;
    });

    expect(snapshot.get('key')).toBe(value);
    expect(owner).toBe(snapshot);
  });
});
