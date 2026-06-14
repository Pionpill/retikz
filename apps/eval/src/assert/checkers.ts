import type { Scene } from '@retikz/core';
import { type Assertion, type AssertionResult } from './types';
import { allText, flattenPrimitives } from './primitives';

type Result = Pick<AssertionResult, 'pass' | 'actual'>;
type Checker<K extends Assertion['kind']> = (
  scene: Scene,
  assertion: Extract<Assertion, { kind: K }>,
) => Result;

const cmp = (a: number, op: '==' | '>=' | '<=' | '>' | '<', b: number): boolean => {
  switch (op) {
    case '==':
      return a === b;
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '<':
      return a < b;
  }
};

const textPresent: Checker<'textPresent'> = (scene, a) => {
  const needle = a.text.trim();
  const lines = allText(scene).map((t) => t.trim());
  const hit = lines.some((t) => (a.match === 'exact' ? t === needle : t.includes(needle)));
  return {
    pass: hit,
    actual: hit ? `命中文字 '${needle}'` : `未找到含 '${needle}' 的文字（共 ${lines.length} 段文字）`,
  };
};

const primitiveCount: Checker<'primitiveCount'> = (scene, a) => {
  const n = flattenPrimitives(scene).filter((p) => p.type === a.primitive).length;
  return { pass: cmp(n, a.op, a.value), actual: `${a.primitive} 计数 = ${n}（要求 ${a.op} ${a.value}）` };
};

const arrowCount: Checker<'arrowCount'> = (scene, a) => {
  const n = flattenPrimitives(scene).filter(
    (p) => p.type === 'path' && (p.arrowStart !== undefined || p.arrowEnd !== undefined),
  ).length;
  return { pass: cmp(n, a.op, a.value), actual: `带箭头 path 计数 = ${n}（要求 ${a.op} ${a.value}）` };
};

const stylePresent: Checker<'stylePresent'> = (scene, a) => {
  const prims = flattenPrimitives(scene);
  const has = prims.some((p) => {
    if (a.style === 'dashed')
      return 'dashPattern' in p && Array.isArray(p.dashPattern) && p.dashPattern.length > 0;
    if (a.style === 'fill') return 'fill' in p && p.fill !== undefined;
    return 'stroke' in p && p.stroke !== undefined;
  });
  return { pass: has, actual: has ? `存在带 ${a.style} 的原语` : `无原语带 ${a.style}` };
};

export const CHECKERS = {
  textPresent,
  primitiveCount,
  arrowCount,
  stylePresent,
} satisfies { [K in Assertion['kind']]: Checker<K> };
