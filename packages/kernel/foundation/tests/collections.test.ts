import { createReadonlyMap } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

describe('createReadonlyMap', () => {
  it('creates a frozen structural snapshot without exposing Map mutators', () => {
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

  it('preserves value identity and exposes itself as the forEach owner', () => {
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
