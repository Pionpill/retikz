import { RetikzFoundationError, RetikzFoundationErrorCode } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';

import type { RetikzRuntimeError } from '../../src';

import {
  createRuntimeIdentity,
  createRuntimeIdentityLookup,
  RetikzRuntimeErrorCode,
  runtimeIdentityEquals,
} from '../../src';

describe('runtime identity', () => {
  it('复制并冻结 owner 与 segment path', () => {
    const path = ['group', 'node'];
    const identity = createRuntimeIdentity('core', path);
    path[1] = 'changed';

    expect(identity).toEqual({ owner: 'core', path: ['group', 'node'] });
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.path)).toBe(true);
  });

  it.each([() => createRuntimeIdentity('core', []), () => createRuntimeIdentity('core', Array<string>(2))])(
    '拒绝空 path 与稀疏 path',
    createInvalid => {
      expect(createInvalid).toThrowError(
        expect.objectContaining<Partial<RetikzRuntimeError>>({ code: RetikzRuntimeErrorCode.IdentityInvalid }),
      );
    },
  );

  it.each([() => createRuntimeIdentity('', ['node']), () => createRuntimeIdentity('core', [''])])(
    '直接复用 Foundation 非空字符串错误',
    createInvalid => {
      expect(createInvalid).toThrowError(
        expect.objectContaining<Partial<RetikzFoundationError>>({
          code: RetikzFoundationErrorCode.NonEmptyStringRequired,
        }),
      );
    },
  );

  it('拒绝空 lookup owner', () => {
    expect(() => createRuntimeIdentityLookup('', [])).toThrowError(
      expect.objectContaining<Partial<RetikzFoundationError>>({
        code: RetikzFoundationErrorCode.NonEmptyStringRequired,
      }),
    );
  });

  it.each([
    [{ owner: ' \t', path: ['node'] as ReadonlyArray<string> }, ' \t'],
    [{ owner: 'owner', path: ['\u2003'] as ReadonlyArray<string> }, '\u2003'],
  ] as const)('rejects blank identity text with the original value as cause', (input, rejectedValue) => {
    const create = () => createRuntimeIdentity(input.owner, input.path);

    let failure: unknown;
    try {
      create();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(RetikzFoundationError);
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toMatchObject({
      name: 'RetikzFoundationError',
      code: RetikzFoundationErrorCode.NonEmptyStringRequired,
      cause: rejectedValue,
    });
    expect((failure as RetikzFoundationError).cause).toBe(rejectedValue);
  });

  it('rejects a Unicode-whitespace path segment with the segment as cause', () => {
    const rejectedValue = '\u00a0';
    let failure: unknown;
    try {
      createRuntimeIdentity('owner', ['group', rejectedValue]);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(RetikzFoundationError);
    expect(failure).toMatchObject({
      name: 'RetikzFoundationError',
      code: RetikzFoundationErrorCode.NonEmptyStringRequired,
    });
    expect((failure as RetikzFoundationError).cause).toBe(rejectedValue);
  });

  it('按 segment 精确比较，不规范化 Unicode 或特殊字符', () => {
    const segmented = createRuntimeIdentity('owner', ['a', 'b/c', '节点']);
    const joined = createRuntimeIdentity('owner', ['a/b', 'c', '节点']);
    const normalized = createRuntimeIdentity('owner', ['a', 'b/c', '節點']);

    expect(runtimeIdentityEquals(segmented, createRuntimeIdentity('owner', ['a', 'b/c', '节点']))).toBe(true);
    expect(runtimeIdentityEquals(segmented, joined)).toBe(false);
    expect(runtimeIdentityEquals(segmented, normalized)).toBe(false);
  });

  it('建立按 code-unit path 排序的 immutable owner lookup', () => {
    const z = createRuntimeIdentity('owner', ['z']);
    const nested = createRuntimeIdentity('owner', ['a', 'b']);
    const a = createRuntimeIdentity('owner', ['a']);
    const lookup = createRuntimeIdentityLookup('owner', [z, nested, a]);

    expect(lookup.owner).toBe('owner');
    expect(lookup.size).toBe(3);
    expect(lookup.values()).toEqual([a, nested, z]);
    expect(Object.isFrozen(lookup.values())).toBe(true);
    expect(lookup.has(createRuntimeIdentity('owner', ['a', 'b']))).toBe(true);
    expect(lookup.has(createRuntimeIdentity('owner', ['missing']))).toBe(false);
  });

  it('复制 lookup 输入且每次返回 immutable copy', () => {
    const identity = createRuntimeIdentity('owner', ['a']);
    const source = [identity];
    const lookup = createRuntimeIdentityLookup('owner', source);
    source.length = 0;

    expect(lookup.size).toBe(1);
    expect(lookup.values()).not.toBe(lookup.values());
    expect(lookup.values()).toEqual([identity]);
  });

  it.each([
    [createRuntimeIdentity('other', ['a']), createRuntimeIdentity('owner', ['b'])],
    [createRuntimeIdentity('owner', ['a']), createRuntimeIdentity('owner', ['a'])],
  ])('拒绝 owner mismatch 与重复 segment path', (...identities) => {
    expect(() => createRuntimeIdentityLookup('owner', identities)).toThrowError(
      expect.objectContaining<Partial<RetikzRuntimeError>>({ code: RetikzRuntimeErrorCode.IdentityInvalid }),
    );
  });

  it('接受空 identity 集合', () => {
    const lookup = createRuntimeIdentityLookup('owner', []);
    expect(lookup.size).toBe(0);
    expect(lookup.values()).toEqual([]);
  });
});
