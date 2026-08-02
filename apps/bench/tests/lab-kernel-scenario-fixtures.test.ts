import type { IRChild, IRPath } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createKernelLabScenePair, KernelLabScenarioId, kernelLabScenarios } from '../src/playground/modules/kernel';

const changedIndexes = (first: ReadonlyArray<unknown>, second: ReadonlyArray<unknown>): Array<number> =>
  first.flatMap((value, index) => (value === second[index] ? [] : [index]));

/** 识别带显式 children 的 Kernel Path */
const isKernelPath = (child: IRChild): child is IRPath =>
  child.type === 'path' && !('namespace' in child) && child.children !== undefined;

describe('Kernel Performance Lab 场景 fixture', () => {
  it('为每个目录场景提供确定性的 Scene pair', () => {
    for (const scenario of kernelLabScenarios) {
      expect(createKernelLabScenePair(scenario.id)).toEqual(createKernelLabScenePair(scenario.id));
    }
  });

  it('每个 Scene pair 都能通过 Kernel 编译边界', () => {
    for (const scenario of kernelLabScenarios) {
      const { first, second } = createKernelLabScenePair(scenario.id);
      expect(compileToScene(first).scene.primitives.length).toBeGreaterThan(0);
      expect(compileToScene(second).scene.primitives.length).toBeGreaterThan(0);
    }
  });

  it('密集节点网格对全部节点执行样式更新', () => {
    const { first, second } = createKernelLabScenePair(KernelLabScenarioId.DenseNodeGrid);

    expect(first.children).toHaveLength(5_000);
    expect(first.children.every(child => child.type === 'node')).toBe(true);
    expect(changedIndexes(first.children, second.children)).toHaveLength(5_000);
  });

  it('混合图元同时覆盖普通节点、文本节点与路径', () => {
    const { first, second } = createKernelLabScenePair(KernelLabScenarioId.MixedPrimitives);
    const childTypes = new Set(first.children.map(child => child.type));

    expect(first.children).toHaveLength(3_000);
    expect(childTypes).toEqual(new Set(['node', 'path']));
    expect(first.children.some(child => child.type === 'node' && child.text !== undefined)).toBe(true);
    expect(changedIndexes(first.children, second.children)).toHaveLength(3_000);
  });

  it('复杂路径包含多段 cubic 与 line，并对全部路径执行样式更新', () => {
    const { first, second } = createKernelLabScenePair(KernelLabScenarioId.ComplexPaths);
    const path = first.children[0];

    expect(first.children).toHaveLength(1_000);
    expect(path).toMatchObject({ type: 'path' });
    if (!isKernelPath(path)) throw new Error('expected complex path fixture');
    expect(path.children.filter(step => step.kind === 'cubic')).toHaveLength(3);
    expect(path.children.filter(step => step.kind === 'line')).toHaveLength(3);
    expect(changedIndexes(first.children, second.children)).toHaveLength(1_000);
  });

  it('节点拖动只替换一个节点的位置', () => {
    const { first, second } = createKernelLabScenePair(KernelLabScenarioId.NodeDrag);
    const changes = changedIndexes(first.children, second.children);

    expect(changes).toEqual([2_500]);
    expect(second.children[2_500]).toMatchObject({ position: [12, 312] });
  });

  it('节点选中只替换一个节点的视觉状态', () => {
    const { first, second } = createKernelLabScenePair(KernelLabScenarioId.NodeSelection);
    const changes = changedIndexes(first.children, second.children);

    expect(changes).toEqual([2_500]);
    expect(second.children[2_500]).toMatchObject({ fill: '#f59e0b', stroke: '#fef3c7', strokeWidth: 3 });
  });

  it('节点增删保留未变化节点 identity，并替换一个稳定 ID', () => {
    const { first, second } = createKernelLabScenePair(KernelLabScenarioId.NodeInsertRemove);
    const firstById = new Map(first.children.map(child => [child.id, child]));
    const secondById = new Map(second.children.map(child => [child.id, child]));

    expect(first.children).toHaveLength(5_000);
    expect(second.children).toHaveLength(5_000);
    expect(secondById.has('entity-00000')).toBe(false);
    expect(secondById.has('entity-inserted')).toBe(true);
    expect(secondById.get('entity-00001')).toBe(firstById.get('entity-00001'));
  });
});
