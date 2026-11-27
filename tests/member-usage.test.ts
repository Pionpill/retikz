import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeMemberUsage, parseArguments } from '../scripts/member-usage.ts';

const packages = [
  { name: '@fixture/a', directory: 'packages/group/a', exports: './src/index.ts' },
  { name: '@fixture/b', directory: 'packages/group/b', exports: './src/index.ts' },
];

/** 通过内存源码验证实际解析结果，不扫描仓库生产代码 */
const inspect = (extra: Record<string, string> = {}, selected = ['@fixture/a']) =>
  analyzeMemberUsage({
    root: process.cwd(),
    packages,
    selected,
    sources: {
      'packages/group/a/src/model.ts': `
        export interface Shape { size: number }
        export const object = { value: 1, unused: 2 };
        export function recursive(): number { return recursive(); }
        export const unused = 1;
        export class Box { read() { return 1; } }
      `,
      'packages/group/a/src/index.ts': 'export * from "./barrel";',
      'packages/group/a/src/barrel.ts':
        'export { object as api, recursive, Box } from "./model"; export type { Shape } from "./model";',
      'packages/group/b/src/index.ts': `
        import { api as alias, Box, type Shape } from '@fixture/a';
        const shape: Shape = { size: alias.value };
        new Box().read();
        const unused = 2;
        const payload = { unused };
      `,
      ...extra,
    },
  });

test('单包报告仍追踪跨包别名、类型和属性，公开转导出不算消费者', () => {
  const report = inspect();
  const object = report.members.find(member => member.name === 'object');
  assert.ok(object);
  assert.equal(object.references.length, 1);
  assert.ok(report.publicExports.some(item => item.name === 'api' && item.target === object.id));
  assert.equal(report.members.find(member => member.name === 'Shape')?.references.length, 1);
  assert.equal(report.members.find(member => member.name === 'value')?.references.length, 1);
  assert.equal(report.members.find(member => member.name === 'read')?.references.length, 1);
  assert.equal(
    report.members.find(member => member.name === 'unused' && member.kind === 'variable')?.references.length,
    0,
  );
  assert.ok(report.members.every(member => member.package === '@fixture/a'));
  assert.deepEqual(report.unresolvedModules, []);
});

test('自递归单列，不把声明、仅 import 或转导出当真实引用', () => {
  const report = inspect({ 'packages/group/b/src/import-only.ts': 'import { recursive } from "@fixture/a";' });
  const member = report.members.find(item => item.name === 'recursive');
  assert.ok(member);
  assert.equal(member.references.length, 0);
  assert.equal(member.selfReferences.length, 1);
  assert.ok(member.forwarding.length > 0);
});

test('非生产目录与测试文件都不贡献引用', () => {
  const sources = Object.fromEntries(
    ['tests', 'evals', 'benchmarks', 'docs', 'eval', 'bench'].map(folder => [
      `packages/group/a/${folder}/use.ts`,
      'import { unused } from "../src/model"; console.log(unused);',
    ]),
  );
  sources['packages/group/a/src/use.test.ts'] = 'import { unused } from "./model"; console.log(unused);';
  const report = inspect(sources);
  assert.equal(
    report.members.find(member => member.name === 'unused' && member.kind === 'variable')?.references.length,
    0,
  );
  assert.equal(report.excludedFiles.length, 7);
});

test('全部包保留同名成员各自引用，简写与字符串属性读取可追踪', () => {
  const report = inspect(
    {
      'packages/group/b/src/access.ts': 'import { api } from "@fixture/a"; api["value"];',
    },
    packages.map(item => item.name),
  );
  const members = report.members.filter(member => member.name === 'unused' && member.kind === 'variable');
  assert.equal(members.length, 2);
  assert.deepEqual(members.map(member => member.references.length).sort(), [0, 1]);
  assert.equal(report.members.find(member => member.name === 'value')?.references.length, 2);
});

test('未解析模块显式报告，不能把缺失解析当完整统计', () => {
  const report = inspect({ 'packages/group/b/src/missing.ts': 'import { absent } from "missing-package"; absent();' });
  assert.ok(report.unresolvedModules.some(item => item.specifier === 'missing-package'));
});

test('解构读取归源属性，默认和 namespace 导出留在公开入口清单', () => {
  const report = inspect({
    'packages/group/a/src/index.ts':
      'export * from "./barrel"; export * as models from "./model"; export { object as default } from "./model";',
    'packages/group/b/src/access.ts':
      'import api from "@fixture/a"; const { value: extracted } = api; console.log(extracted);',
  });
  assert.equal(report.members.find(member => member.name === 'value')?.references.length, 2);
  assert.ok(report.publicExports.some(item => item.name === 'default' && item.target));
  assert.ok(report.publicExports.some(item => item.name === 'models' && item.declaration));
});

test('范围必须显式且互斥，支持单包、所有包与输出路径', () => {
  assert.deepEqual(parseArguments(['--all']), { all: true });
  assert.deepEqual(parseArguments(['--package', '@fixture/a', '--output', 'notes/reports/usage.json']), {
    package: '@fixture/a',
    output: 'notes/reports/usage.json',
    all: false,
  });
  for (const args of [[], ['--all', '--package', 'a'], ['--package'], ['--unknown'], ['--all', '--all']]) {
    assert.throws(() => parseArguments(args));
  }
});

test('只有子入口的包不要求根入口，跨包子路径引用归原声明', () => {
  const report = analyzeMemberUsage({
    root: process.cwd(),
    packages: [
      {
        name: '@fixture/render',
        directory: 'packages/group/render',
        exports: {
          './svg': { types: './src/svg/index.ts', default: './src/svg/index.ts' },
          './canvas': './src/canvas/index.ts',
        },
      },
    ],
    selected: ['@fixture/render'],
    sources: {
      'packages/group/render/src/shared.ts': 'export const draw = () => 1;',
      'packages/group/render/src/svg/index.ts': 'export { draw } from "../shared";',
      'packages/group/render/src/canvas/index.ts': 'export { draw } from "../shared";',
      'packages/group/consumer/src/index.ts': 'import { draw } from "@fixture/render/svg"; draw();',
    },
  });
  assert.deepEqual(report.missingEntries, []);
  assert.deepEqual(report.unresolvedModules, []);
  assert.equal(report.publicExports.length, 2);
  assert.deepEqual(report.publicExports.map(item => item.subpath).sort(), ['./canvas', './svg']);
  assert.equal(new Set(report.publicExports.map(item => item.target)).size, 1);
  assert.equal(report.members.find(member => member.name === 'draw')?.references.length, 1);
});

test('根条件导出可解析，缺失、通配符和非源码入口明确报告，不推断未声明入口', () => {
  const report = analyzeMemberUsage({
    root: process.cwd(),
    packages: [
      {
        name: '@fixture/root',
        directory: 'packages/group/root',
        exports: { types: './src/index.ts', import: './src/index.ts' },
      },
      {
        name: '@fixture/partial',
        directory: 'packages/group/partial',
        exports: {
          './missing': './src/missing.ts',
          './private': null,
          './*': './src/*.ts',
          './built': './dist/main.js',
        },
      },
      { name: '@fixture/undeclared', directory: 'packages/group/undeclared' },
    ],
    selected: ['@fixture/root', '@fixture/partial', '@fixture/undeclared'],
    sources: {
      'packages/group/root/src/index.ts': 'export const api = 1;',
      'packages/group/partial/src/index.ts': 'export const privateApi = 1;',
      'packages/group/undeclared/src/index.ts': 'export const unclassified = 1;',
    },
  });
  assert.deepEqual(
    report.publicExports.map(item => [item.name, item.subpath]),
    [['api', '.']],
  );
  assert.deepEqual(report.missingEntries, ['packages/group/partial/src/missing.ts']);
  assert.ok(report.unclassifiedExports.some(item => item.subpath === './*'));
  assert.ok(report.unclassifiedExports.some(item => item.subpath === './built'));
  assert.ok(report.unclassifiedExports.some(item => item.package === '@fixture/undeclared'));
  assert.ok(!report.unclassifiedExports.some(item => item.subpath === './private'));
});
