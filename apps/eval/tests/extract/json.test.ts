import { describe, expect, it } from 'vitest';
import { extractJson } from '../../src/extract/json';

describe('extractJson', () => {
  it('解析裸 JSON 对象', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('剥掉 ```json 围栏', () => {
    const text = '```json\n{"a":1}\n```';
    expect(extractJson(text)).toEqual({ a: 1 });
  });

  it('剥掉前后解释文字，取首个完整对象', () => {
    const text = 'Here you go:\n{"version":1,"type":"scene","children":[]}\nDone.';
    expect(extractJson(text)).toEqual({
      version: 1,
      type: 'scene',
      children: [],
    });
  });

  it('无法解析时返回 null', () => {
    expect(extractJson('no json here')).toBeNull();
    expect(extractJson('{not valid}')).toBeNull();
  });
});
