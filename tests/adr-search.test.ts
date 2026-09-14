import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('scripts/adr-search.mjs');

/** 在隔离仓库中测试实际命令行行为 */
const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'retikz-adr-search-'));
  const add = (owner: string, version: string, name: string, header: string, body = '') => {
    const group = owner === 'kernel' ? 'kernel' : 'schematic';
    const family = owner === 'kernel' ? '' : `${owner}/`;
    const file = path.join(root, `packages/${group}/_notes/decisions/${family}v0/${version}/${name}.md`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `---\n${header}\n---\n\n# ADR-001：布局\n\n${body}`, 'utf8');
    return file;
  };
  add('diagram', 'v0.1', '001-grid', 'description: 网格布局与行列对齐\nkeywords: FlowGrid、grid', '正文独有词');
  add('graph', 'v0.1', '001-block', 'description: 内容节点布局\nkeywords: Block、 grid');
  add('kernel', 'v0.5', '001-layout', 'description: "容器约束: 测量与排列"\nkeywords: "layout、grid"');
  return {
    root,
    add,
    run: (...args: Array<string>) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' }),
    clean: () => rmSync(root, { recursive: true, force: true }),
  };
};

test('按中文、英文与 API 名检索摘要，默认不返回或搜索正文', t => {
  const f = fixture();
  t.after(f.clean);
  for (const query of ['网格', 'FLOWGRID', 'grid']) {
    const result = f.run(query, '--owner', 'diagram', '--json');
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.total, 1);
    assert.equal(output.results[0].owner, 'diagram');
    assert.match(output.results[0].description, /网格/);
    assert.deepEqual(output.results[0].keywords, ['FlowGrid', 'grid']);
    assert.ok(!result.stdout.includes('正文独有词'));
  }
  assert.equal(JSON.parse(f.run('正文独有词', '--json').stdout).total, 0);
  assert.equal(JSON.parse(f.run('正文独有词', '--body', '--json').stdout).total, 1);
});

test('owner 与版本筛选精确区分同编号，并报告无匹配', t => {
  const f = fixture();
  t.after(f.clean);
  const result = JSON.parse(f.run('grid', '--owner', 'kernel', '--version', 'v0.5', '--json').stdout);
  assert.equal(result.total, 1);
  assert.match(result.results[0].path, /kernel\/.*v0\.5\/001-layout\.md$/);
  assert.equal(JSON.parse(f.run('grid', '--owner', 'diagram', '--version', 'v0.5', '--json').stdout).total, 0);
  assert.match(f.run('不存在的查询').stdout, /0/);
});

test('限量输出保留总命中数且多词查询要求全部命中', t => {
  const f = fixture();
  t.after(f.clean);
  const first = f.run('grid', '--limit', '1', '--json');
  const result = JSON.parse(first.stdout);
  assert.equal(result.total, 3);
  assert.equal(result.results.length, 1);
  assert.equal(first.stdout, f.run('grid', '--limit', '1', '--json').stdout);
  assert.equal(JSON.parse(f.run('grid', 'FlowGrid', '--json').stdout).total, 1);
});

test('拒绝空查询、未知筛选、非法限量和未知参数', t => {
  const f = fixture();
  t.after(f.clean);
  for (const args of [
    [],
    ['grid', '--owner', 'typo'],
    ['grid', '--limit', '0'],
    ['grid', '--limit', '1.5'],
    ['grid', '--limit', '101'],
    ['grid', '--wat'],
    ['grid', '--version'],
  ]) {
    const result = f.run(...args);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.length > 0);
  }
});

test('校验合法 YAML 并拒绝缺失、非法及错误类型的元数据，不改写文件', t => {
  const f = fixture();
  t.after(f.clean);
  assert.equal(f.run('--check').status, 0);
  const invalid = f.add('diagram', 'v0.1', '002-invalid', 'description: []\nkeywords: grid');
  const before = readFileSync(invalid, 'utf8');
  const result = f.run('--check');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /002-invalid/);
  assert.equal(readFileSync(invalid, 'utf8'), before);
  for (const keywords of ['[grid]', 'grid、、layout', '"grid\\nlayout"', '']) {
    writeFileSync(invalid, `---\ndescription: 网格\nkeywords: ${keywords}\n---\n\n# ADR-002：布局\n`, 'utf8');
    assert.notEqual(f.run('--check').status, 0, keywords);
  }
  writeFileSync(invalid, '# ADR-002：缺少元数据\n', 'utf8');
  assert.notEqual(f.run('--check').status, 0);
  writeFileSync(invalid, '---\ndescription: [\n---\n', 'utf8');
  assert.notEqual(f.run('--check').status, 0);
});
