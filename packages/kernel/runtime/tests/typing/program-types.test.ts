import { describe, expectTypeOf, it } from 'vitest';

import type { RuntimeOwnerDefinition } from '../../src/owner';
import type { RuntimeCandidateView, RuntimeProgramDefinition, RuntimeProgramToken } from '../../src/program';

import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeChangeSet, createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

describe('runtime program types', () => {
  it('Program token、CandidateView 与 registry 保留具体泛型', () => {
    const owner = defineRuntimeOwner<number, number, number, { delta: number }>({
      key: 'counter',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const program = defineRuntimeProgram<number, Readonly<{ value: number }>, number, string>({
      id: { owner: 'counter', key: 'counter' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => Object.freeze({ value }),
        readForProgram: artifact => artifact.value,
        read: artifact => artifact.value.toString(),
      },
      run: view => {
        expectTypeOf(view).toEqualTypeOf<RuntimeCandidateView>();
        expectTypeOf(view.snapshot(owner).value).toEqualTypeOf<number>();
        expectTypeOf(view.changeSet(owner)).toEqualTypeOf<
          ReturnType<typeof createRuntimeChangeSet<{ delta: number }>> | undefined
        >();
        return { kind: 'full', artifact: view.snapshot(owner).value };
      },
      update: (previous, view) => {
        expectTypeOf(previous).toEqualTypeOf<number>();
        return { kind: 'incremental', artifact: view.snapshot(owner).value };
      },
    });
    const registry = createRuntimeProgramRegistry({
      owners: createRuntimeOwnerRegistry({ builtins: [owner] }),
      builtins: [program],
    });

    expectTypeOf(program).toMatchTypeOf<RuntimeProgramDefinition<number, { value: number }, number, string>>();
    expectTypeOf(program).not.toMatchTypeOf<RuntimeProgramDefinition<string, { value: number }, number, string>>();
    expectTypeOf(program).not.toMatchTypeOf<RuntimeProgramDefinition<number, { text: string }, number, string>>();
    expectTypeOf(program).not.toMatchTypeOf<RuntimeProgramDefinition<number, { value: number }, string, string>>();
    expectTypeOf(program).not.toMatchTypeOf<RuntimeProgramDefinition<number, { value: number }, number, number>>();
    expectTypeOf(registry.resolve(program)).toEqualTypeOf<typeof program>();
    expectTypeOf(registry.find(program.id)).toEqualTypeOf<RuntimeProgramToken | undefined>();
  });

  it('owner command builder 在具体 Definition 作用域拒绝错误 value/change', () => {
    const owner = defineRuntimeOwner<number, number, number, { delta: number }>({
      key: 'counter',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const revision = 0 as ReturnType<typeof createRuntimeChangeSet<{ delta: number }>>['baseRevision'];
    const changes = createRuntimeChangeSet(revision, [{ delta: 1 }]);

    createRuntimeOwnerInput(owner, 1);
    createRuntimeOwnerUpdate(owner, 2, changes);

    // @ts-expect-error owner input 必须匹配 TInput
    createRuntimeOwnerInput(owner, '1');
    // @ts-expect-error owner update value 必须匹配 TInput
    createRuntimeOwnerUpdate(owner, '2', changes);
    // @ts-expect-error change set 必须匹配 TChange
    createRuntimeOwnerUpdate(owner, 2, createRuntimeChangeSet(revision, [{ append: 'x' }]));

    expectTypeOf(owner).toMatchTypeOf<RuntimeOwnerDefinition<number, number, number, { delta: number }>>();
  });
});
