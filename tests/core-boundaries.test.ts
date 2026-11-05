import assert from 'node:assert/strict';
import test from 'node:test';

import { collectCoreBoundaryDiagnostics } from '../scripts/check-core-boundaries.mjs';

/** 用真实模块边界构造内存源码，不访问或改写生产文件 */
const inspect = (filePath: string, content: string) =>
  collectCoreBoundaryDiagnostics([
    { filePath: 'schemas/index.ts', content: 'export {};' },
    { filePath: 'schemas/node/node.ts', content: 'export {};' },
    { filePath: 'shared/index.ts', content: 'export {};' },
    { filePath: 'shared/anchor.ts', content: 'export {};' },
    { filePath: 'error.ts', content: 'export {};' },
    { filePath: 'contract/index.ts', content: 'export {};' },
    { filePath: 'contract/shape/index.ts', content: 'export {};' },
    { filePath: 'contract/shape/types.ts', content: 'export {};' },
    { filePath: 'providers/index.ts', content: 'export {};' },
    { filePath: 'providers/arrow.ts', content: 'export {};' },
    { filePath: 'providers/shape/index.ts', content: 'export {};' },
    { filePath: 'providers/shape/rectangle.ts', content: 'export {};' },
    { filePath: 'compile/node/index.ts', content: 'export {};' },
    { filePath: 'compile/node/layout.ts', content: 'export {};' },
    { filePath, content },
  ]);

test('shared 和 resolve 的上层依赖报告位置，type-only 与 re-export 同样受检', () => {
  const diagnostics = inspect('shared/bad.ts', '\nimport type { IRNode } from "../schemas";');
  assert.ok(diagnostics.some(diagnostic => diagnostic.rule === 'layer-dependency' && diagnostic.line === 2));
  assert.ok(
    inspect('resolve/node/resolve.ts', 'export type { Layout } from "../../compile/node";').some(
      diagnostic => diagnostic.rule === 'layer-dependency',
    ),
  );
});

test('跨 owner 经过 barrel，同 owner 保留相邻引用', () => {
  assert.deepEqual(inspect('compile/node/emit.ts', 'import { Layout } from "./layout";'), []);
  assert.deepEqual(inspect('compile/node/emit.ts', 'import { Shape } from "../../contract/shape";'), []);
  assert.ok(
    inspect('compile/node/emit.ts', 'import { Shape } from "../../contract/shape/types";').some(
      diagnostic => diagnostic.rule === 'owner-barrel',
    ),
  );
  assert.ok(
    inspect('compile/node/emit.ts', 'import { rectangle } from "../../providers/shape/rectangle";').some(
      diagnostic => diagnostic.rule === 'owner-barrel',
    ),
  );
});

test('schemas 是统一 owner，外部使用根 barrel，内部可按初始化关系引用', () => {
  assert.deepEqual(inspect('schemas/path/path.ts', 'import { Node } from "../node/node";'), []);
  assert.deepEqual(inspect('contract/shape/types.ts', 'import type { IRNode } from "../../schemas";'), []);
  assert.ok(
    inspect('contract/shape/types.ts', 'import type { IRNode } from "../../schemas/node/node";').some(
      diagnostic => diagnostic.rule === 'owner-barrel',
    ),
  );
});

test('扁平 provider 经根入口，路径规范化和显式 index 不绕过边界', () => {
  assert.deepEqual(inspect('providers/shape/shape.ts', 'import { registry } from "../arrow";'), []);
  assert.deepEqual(inspect('shared/geometry/point.ts', 'import { Error } from "../../error";'), []);
  assert.deepEqual(inspect('resolve/node/resolve.ts', 'import { Arrow } from "../../providers/index";'), []);
  assert.ok(
    inspect('resolve/node/resolve.ts', 'import { Arrow } from "../../providers/./arrow";').some(
      diagnostic => diagnostic.rule === 'owner-barrel',
    ),
  );
});

test('副作用导入、动态 import 与 import type 查询都不能绕过边界', () => {
  for (const content of [
    'import "../../providers/arrow";',
    'export const load = () => import("../../providers/arrow");',
    'export type Arrow = import("../../providers/arrow").Arrow;',
  ]) {
    assert.ok(inspect('resolve/node/resolve.ts', content).some(diagnostic => diagnostic.rule === 'owner-barrel'));
  }
});

test('Core 的外部依赖保持 Foundation、Math 与 Zod', () => {
  assert.deepEqual(inspect('shared/value.ts', 'import { lerp } from "@retikz/math";'), []);
  assert.ok(
    inspect('compile/node/emit.ts', 'import { compileToScene } from "@retikz/reconciler";').some(
      diagnostic => diagnostic.rule === 'external-dependency',
    ),
  );
  assert.ok(
    inspect('compile/node/emit.ts', 'import React from "react";').some(
      diagnostic => diagnostic.rule === 'external-dependency',
    ),
  );
  assert.ok(
    inspect('compile/node/emit.ts', 'import { run } from "../../../../reconciler/src";').some(
      diagnostic => diagnostic.rule === 'external-dependency',
    ),
  );
});

test('检查实际时间和随机调用，忽略注释、字符串、显式日期及局部绑定', () => {
  for (const expression of ['Date.now()', 'Math["random"]()', 'globalThis.performance.now()', 'new Date()']) {
    assert.ok(
      inspect('shared/clock.ts', `export const value = ${expression};`).some(
        diagnostic => diagnostic.rule === 'nondeterministic-call',
      ),
      expression,
    );
  }
  assert.deepEqual(
    inspect(
      'shared/clock.ts',
      `
    // Date.now() and Math.random()
    export const label = 'Date.now()';
    export const epoch = new Date(0);
    export const local = (Date: { now: () => number }) => Date.now();
    export const createCache = () => new Map();
  `,
    ),
    [],
  );
});
