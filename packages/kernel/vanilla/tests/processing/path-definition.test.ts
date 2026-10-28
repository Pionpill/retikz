import type { AnyPathDefinition, IRScene } from '@retikz/core';
import { compileToScene, PathSchema } from '@retikz/core';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import { createProcessingController, prepareProcessingInput, processToStaticInputResult } from '../../src';

it('保留完整 Path definition，并在 static 与 retained processing 中执行相同 compile 分支', () => {
  const definition: AnyPathDefinition = {
    name: 'retained-fixture',
    schema: PathSchema.extend({ kind: literal('retained-fixture') }),
    compile: () => ({
      primitives: [{ type: 'ellipse', cx: 3, cy: 5, rx: 2, ry: 4 }],
      boundsPoints: [
        [1, 1],
        [5, 9],
      ],
    }),
  };
  const input: IRScene = {
    version: 1,
    type: 'scene',
    children: [{ type: 'path', kind: 'retained-fixture' }],
  };
  const options = { compile: { paths: [definition] } };
  const prepared = prepareProcessingInput(input, options);
  expect(prepared.coreOptions.paths?.[0]).toBe(definition);
  const direct = compileToScene(input, options.compile).scene;
  const retained = createProcessingController(input, options);
  try {
    expect(processToStaticInputResult(input, options).scene).toEqual(direct);
    expect(retained.read().scene).toEqual(direct);
    expect(direct.primitives).toContainEqual(expect.objectContaining({ type: 'ellipse', cx: 3, cy: 5 }));
  } finally {
    retained.dispose();
  }
});
