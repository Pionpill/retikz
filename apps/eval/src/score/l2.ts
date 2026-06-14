import type { Scene } from '@retikz/core';
import { type Assertion, type AssertionResult } from '../assert/types';
import { evaluateAssertions } from '../assert/evaluate';

/** L2 语义打分：对编译好的 Scene 跑断言集，汇总通过数 */
export type L2Result = {
  total: number;
  passed: number;
  results: Array<AssertionResult>;
};

export const scoreL2 = (scene: Scene, assertions: Array<Assertion>): L2Result => {
  const results = evaluateAssertions(scene, assertions);
  return { total: results.length, passed: results.filter((r) => r.pass).length, results };
};
