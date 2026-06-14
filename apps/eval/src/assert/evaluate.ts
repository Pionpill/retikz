import type { Scene } from '@retikz/core';
import { type Assertion, type AssertionResult } from './types';
import { CHECKERS } from './checkers';

/** 逐条对 Scene 求值断言，返回与输入同序的结果数组 */
export const evaluateAssertions = (
  scene: Scene,
  assertions: Array<Assertion>,
): Array<AssertionResult> =>
  assertions.map((a) => {
    // CHECKERS 以 kind 为键，等价于按判别分发；用单态签名中转避免联合签名不可调用
    const checker = CHECKERS[a.kind] as (
      s: Scene,
      x: Assertion,
    ) => Pick<AssertionResult, 'pass' | 'actual'>;
    const { pass, actual } = checker(scene, a);
    return { kind: a.kind, description: a.description, pass, actual };
  });
