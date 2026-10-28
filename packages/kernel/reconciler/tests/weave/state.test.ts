import type { IRScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { readWeaveCurrent, WeaveReconciler, WeaveTransaction } from '../../src/weave';

const input: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'scope',
      localNamespace: true,
      children: [
        { type: 'node', id: 'a', position: [0, 0] },
        { type: 'node', id: 'b', position: { direction: 'right', of: 'a' } },
      ],
    },
  ],
};

/** 构造包含声明及双向依赖的已提交树 */
const fixture = () => {
  const prepared = new WeaveReconciler(input).mount();
  const root = prepared.root;
  const scope = readWeaveCurrent(root).children[0];
  if (scope.type !== 'scope') throw new Error('Expected scope fixture');
  const [a, b] = readWeaveCurrent(scope).children;
  if (a.type !== 'node' || b.type !== 'node') throw new Error('Expected node fixtures');
  return { prepared, root, scope, a, b };
};

describe('Weave 候选状态隔离', () => {
  it('修改叶子输入共享只读编译结果，不复制父子结构，丢弃恢复旧视图', () => {
    const { root, scope, a } = fixture();
    const before = readWeaveCurrent(a);
    const children = readWeaveCurrent(scope).children;
    const work = new WeaveTransaction(root);
    const pending = work.editNode(a);
    pending.input = { ...pending.input, own: { ...pending.input.own, text: 'changed' } };
    expect(work.readNode(a).input.own.text).toBe('changed');
    expect(readWeaveCurrent(a)).toBe(before);
    expect(before.input.own.text).toBeUndefined();
    expect(pending.compiled).toBe(before.compiled);
    expect(work.readNode(scope).children).toBe(children);
    expect(scope.pending).toBeNull();
    work.rollback();
    expect(a.pending).toBeNull();
    expect(readWeaveCurrent(a)).toBe(before);
  });

  it('结构与局部索引按需隔离，同批多次写入复用副本', () => {
    const { root, scope, a, b } = fixture();
    const original = readWeaveCurrent(scope);
    const work = new WeaveTransaction(root);
    const children = work.editNodeAttribute(scope, 'children');
    children.splice(0, 1);
    work.editNodeAttribute(scope, 'ids').delete('a');
    expect(work.editNodeAttribute(scope, 'children')).toBe(children);
    expect(work.readNode(scope).children).toEqual([b]);
    expect(original.children).toEqual([a, b]);
    expect(original.ids?.get('a')).toBe(a);
    work.rollback();
    expect(readWeaveCurrent(scope)).toBe(original);
    expect(scope.pending).toBeNull();
  });

  it('依赖及反向消费者、读取记录在提交前不污染旧状态', () => {
    const { root, a, b } = fixture();
    const original = readWeaveCurrent(b);
    const kinds = original.dependencies.get(a);
    const records = readWeaveCurrent(root).records;
    const work = new WeaveTransaction(root);
    const dependencies = work.editNodeAttribute(b, 'dependencies');
    dependencies.delete(a);
    expect(work.editNodeAttribute(b, 'dependencies')).toBe(dependencies);
    const consumers = work.editNodeAttribute(a, 'consumers');
    consumers.delete(b);
    expect(work.editNodeAttribute(a, 'consumers')).toBe(consumers);
    work.editNodeAttribute(root, 'records').set(b, { reads: [], diagnostics: [] });
    expect(work.readNode(b).dependencies.has(a)).toBe(false);
    expect(work.readNode(a).consumers.has(b)).toBe(false);
    expect(original.dependencies.get(a)).toBe(kinds);
    expect(readWeaveCurrent(a).consumers.has(b)).toBe(true);
    expect(records.get(b)?.reads.length).toBeGreaterThan(0);
    work.commit();
    expect(readWeaveCurrent(b).dependencies.has(a)).toBe(false);
    expect(readWeaveCurrent(a).consumers.has(b)).toBe(false);
    expect(readWeaveCurrent(root).records.get(b)?.reads).toEqual([]);
    work.finish();
    expect(a.pending).toBeNull();
    expect(b.pending).toBeNull();
  });

  it('已切换状态在事务最终确认前可以整体恢复，旧 Scene 不变', () => {
    const { prepared, root, scope, a } = fixture();
    const output = JSON.stringify(prepared.compilation.result);
    const beforeRoot = readWeaveCurrent(root);
    const beforeScope = readWeaveCurrent(scope);
    const beforeNode = readWeaveCurrent(a);
    const work = new WeaveTransaction(root);
    work.editNodeAttribute(root, 'children').length = 0;
    work.editNodeAttribute(root, 'scopeIds').delete(scope.scopeId);
    work.editNodeAttribute(scope, 'ids').delete('a');
    const pending = work.editNode(a);
    pending.input = { ...pending.input, own: { ...pending.input.own, text: 'candidate' } };
    work.commit();
    expect(readWeaveCurrent(root).children).toEqual([]);
    work.rollback();
    expect(readWeaveCurrent(root)).toBe(beforeRoot);
    expect(readWeaveCurrent(scope)).toBe(beforeScope);
    expect(readWeaveCurrent(a)).toBe(beforeNode);
    expect(JSON.stringify(prepared.compilation.result)).toBe(output);
  });

  it('新节点仅存在于候选结构，丢弃后没有已提交状态或索引残留', () => {
    const { root, scope, a } = fixture();
    const work = new WeaveTransaction(root);
    const added = { type: 'node' as const, current: null, pending: { ...readWeaveCurrent(a) } };
    work.editNode(added);
    work.editNodeAttribute(scope, 'children').push(added);
    work.editNodeAttribute(scope, 'ids').set('new', added);
    expect(() => readWeaveCurrent(added)).toThrow(/no committed state/);
    expect(readWeaveCurrent(scope).ids?.has('new')).toBe(false);
    work.rollback();
    expect(added.current).toBeNull();
    expect(added.pending).toBeNull();
    expect(readWeaveCurrent(scope).children).not.toContain(added);
  });

  it('同树候选互斥，最终确认或丢弃后释放占用', () => {
    const { root, a } = fixture();
    const work = new WeaveTransaction(root);
    expect(() => new WeaveTransaction(root)).toThrow(/already has a candidate/);
    work.editNode(a);
    work.commit();
    expect(() => new WeaveTransaction(root)).toThrow(/already has a candidate/);
    work.finish();
    const next = new WeaveTransaction(root);
    next.editNode(a);
    next.rollback();
    expect(() => work.editNode(a)).toThrow(/not preparing/);
    expect(() => work.commit()).toThrow(/not preparing/);
  });
});

it('未完成状态阻止整批提交，不切换此前已检查的节点', () => {
  const { root, a, b } = fixture();
  const before = readWeaveCurrent(a);
  const work = new WeaveTransaction(root);
  work.editNode(a);
  work.editNode(b).compiled = null;
  expect(() => work.commit()).toThrow(/unfinished Weave state/);
  expect(readWeaveCurrent(a)).toBe(before);
  work.rollback();
  expect(readWeaveCurrent(b).compiled).not.toBeNull();
});

it('普通 Scope 缺少局部 ids 时不隐式创建命名空间', () => {
  const { root } = new WeaveReconciler({
    type: 'scene',
    version: 1,
    children: [{ type: 'scope', children: [] }],
  }).mount();
  const scope = readWeaveCurrent(root).children[0];
  if (scope.type !== 'scope') throw new Error('Expected scope fixture');
  const work = new WeaveTransaction(root);
  expect(() => work.editNodeAttribute(scope, 'ids')).toThrow(/attribute is absent/);
  expect(work.readNode(scope).ids).toBeUndefined();
  expect(readWeaveCurrent(scope).ids).toBeUndefined();
  work.rollback();
});
