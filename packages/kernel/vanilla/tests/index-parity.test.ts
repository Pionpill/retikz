import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { PathKindDefinition } from '../src';

import * as vanilla from '../src';
import { defineArrow, definePathGenerator, definePathKind, definePattern, DrawWay } from '../src';

/**
 * 入口对等性：vanilla 单包应能 import 折角 way 常量 + 扩展面注册器，无需再从 @retikz/core 双包取。
 * 锁定 react↔vanilla 透传对齐——回归时若漏掉某个 re-export，这里直接报缺。
 */
describe('@retikz/vanilla 单包透传（与 react 对齐）', () => {
  it('way-keyword-const：DrawWay 常量单包可达且含关键字成员', () => {
    expect(DrawWay).toBeDefined();
    // 折角 / 相对 / 累积关键字（底层是刻意写丑的字符串，防 id 冲突）
    expect(typeof DrawWay.Cycle).toBe('string');
    expect(typeof DrawWay.Relative).toBe('string');
    expect(typeof DrawWay.Accumulate).toBe('string');
  });

  it('extension-registrars：自定义箭头 / pattern / 路径生成器 / path kind 注册器单包可达', () => {
    expect(typeof defineArrow).toBe('function');
    expect(typeof definePattern).toBe('function');
    expect(typeof definePathGenerator).toBe('function');
    expect(typeof definePathKind).toBe('function');
  });

  it('path-kind-types：path kind 定义和 compile context 类型从单包入口可达', () => {
    const custom = definePathKind({
      schema: z.object({ kind: z.literal('custom') }),
      optionsSchema: z.object({}).strict(),
      compile: () => null,
    }) satisfies PathKindDefinition;

    expect(custom.schema.shape.kind.value).toBe('custom');
  });

  it('namespace-export：以上符号都挂在 @retikz/vanilla 命名空间上', () => {
    for (const name of ['DrawWay', 'defineArrow', 'definePattern', 'definePathGenerator', 'definePathKind'] as const) {
      expect(vanilla[name]).toBeDefined();
    }
  });
});
