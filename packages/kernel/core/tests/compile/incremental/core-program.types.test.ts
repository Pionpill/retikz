import type { RuntimeProgramDefinition } from '@retikz/runtime';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expectTypeOf, it } from 'vitest';

import type { CoreChange, CoreProgramPublicRead, IRScene } from '../../../src';
// @ts-expect-error Core Program private state 不属于包公共面
import type { CoreProgramArtifact } from '../../../src';
// @ts-expect-error Core Program private read 不属于包公共面
import type { CoreProgramRead } from '../../../src';

import { CoreOwnerDefinition, createCoreProgram } from '../../../src';

type PrivateTypeSentinel = CoreProgramArtifact<readonly []> | CoreProgramRead<readonly []>;

type ProgramTypesOf<TDefinition> =
  TDefinition extends RuntimeProgramDefinition<infer TInput, infer TArtifact, infer TRead, infer TPublicRead>
    ? [TInput, TArtifact, TRead, TPublicRead]
    : never;

type ProgramReadOf<TDefinition> = ProgramTypesOf<TDefinition>[2];

void (undefined as unknown as PrivateTypeSentinel);

describe('Core Runtime Program types', () => {
  it('保留 owner change 与 public artifact 的精确类型', () => {
    const program = createCoreProgram({ onWarn: () => {} });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const ir: IRScene = { version: 1, type: 'scene', children: [] };
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, ir)],
    });
    const publicRead = session.artifact(program).value;

    expectTypeOf(publicRead).toEqualTypeOf<CoreProgramPublicRead<readonly []>>();
    expectTypeOf<ProgramReadOf<typeof program>>().toEqualTypeOf<
      CoreProgramPublicRead<readonly []> &
        Readonly<{
          state: Readonly<{ source: Readonly<IRScene> }>;
        }>
    >();
    expectTypeOf(session.snapshot(CoreOwnerDefinition).value).toEqualTypeOf<Readonly<IRScene>>();
    expectTypeOf<CoreChange['kind']>().toEqualTypeOf<'add' | 'update' | 'remove' | 'move'>();
  });
});
