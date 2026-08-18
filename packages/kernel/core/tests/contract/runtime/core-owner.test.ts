import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  RetikzRuntimeErrorCode,
  RuntimeProgramKind,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src';

import { CORE_OWNER_KEY, CoreOwnerDefinition } from '../../../src';

const sceneWithText = (text: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'node-a', position: [0, 0], text }],
});

const createOwnerSession = (source: IRScene) => {
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [] });
  return createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, source)],
  });
};

describe('Core Runtime owner', () => {
  it('使用固定 owner key，并把完整 IR 捕获为 detached deeply immutable Snapshot', () => {
    const source = sceneWithText('A');
    const session = createOwnerSession(source);

    const captured = session.snapshot(CoreOwnerDefinition).value;
    const sourceChild = source.children[0];
    if ('namespace' in sourceChild || sourceChild.type !== 'node') {
      throw new Error('test fixture must contain a node');
    }
    sourceChild.text = 'mutated after capture';

    expect(CoreOwnerDefinition.key).toBe(CORE_OWNER_KEY);
    expect(CORE_OWNER_KEY).toBe('@retikz/core/document');
    expect(captured).toEqual(sceneWithText('A'));
    expect(Object.isFrozen(captured)).toBe(true);
    expect(Object.isFrozen(captured.children)).toBe(true);
    expect(Object.isFrozen(captured.children[0])).toBe(true);

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, sceneWithText('A'))],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Bailout);
    expect(session.revision()).toBe(0);
  });

  it('结构 equality 忽略属性顺序，但真实内容变化会推进 revision', () => {
    const session = createOwnerSession(sceneWithText('A'));
    const reordered: IRScene = {
      children: [{ text: 'A', position: [0, 0], id: 'node-a', type: 'node' }],
      type: 'scene',
      version: 1,
    };
    const equalResult = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, reordered)],
    });

    expect(equalResult.outcome).toBe(RuntimeProgramKind.Bailout);
    expect(session.revision()).toBe(0);

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, sceneWithText('B'))],
    });
    expect(session.revision()).toBe(1);
    expect(session.snapshot(CoreOwnerDefinition).value).toEqual(sceneWithText('B'));
  });

  it('拒绝 cyclic、non-plain、非 finite、稀疏数组、额外数组属性与 symbol key', () => {
    const invalidInputs: Array<IRScene> = [];

    const cyclic = sceneWithText('A');
    Reflect.set(cyclic, 'cycle', cyclic);
    invalidInputs.push(cyclic);

    const nonPlain = sceneWithText('A');
    Reflect.set(nonPlain, 'extra', new Date(0));
    invalidInputs.push(nonPlain);

    const nonFinite = sceneWithText('A');
    const nonFiniteChild = nonFinite.children[0];
    if ('namespace' in nonFiniteChild || nonFiniteChild.type !== 'node') throw new Error('expected node fixture');
    nonFiniteChild.position = [Number.POSITIVE_INFINITY, 0];
    invalidInputs.push(nonFinite);

    const sparse = sceneWithText('A');
    sparse.children.length = 2;
    invalidInputs.push(sparse);

    const extraArrayProperty = sceneWithText('A');
    Reflect.set(extraArrayProperty.children, 'extra', true);
    invalidInputs.push(extraArrayProperty);

    const symbolKey = sceneWithText('A');
    Reflect.set(symbolKey, Symbol('extra'), true);
    invalidInputs.push(symbolKey);

    invalidInputs.forEach(input => {
      expect(() => createOwnerSession(input)).toThrow(RetikzRuntimeErrorCode.CaptureFailed);
    });
  });
});
