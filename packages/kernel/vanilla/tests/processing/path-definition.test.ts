import type { AnyPathDefinition, IRScene } from '@retikz/core';
import { PathSchema } from '@retikz/core';
import { expect, it } from 'vitest';
import { literal } from 'zod';

import { SceneRuntime, compileToScene } from '../../src';
import { compileTestResult } from '../helpers/compilation';

it('保留完整 Path definition，并在 static 与 session processing 中执行相同 compile 分支', () => {
  const definition: AnyPathDefinition = {
    name: 'session-fixture',
    schema: PathSchema.extend({ kind: literal('session-fixture') }),
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
    children: [{ type: 'path', kind: 'session-fixture' }],
  };
  const options = { compile: { paths: [definition] } };
  const direct = compileTestResult(input, options.compile).scene;
  const session = new SceneRuntime(input, options);
  try {
    expect(compileToScene(input, options).scene).toEqual(direct);
    expect(session.current.compilation.result.scene).toEqual(direct);
    expect(direct.primitives).toContainEqual(expect.objectContaining({ type: 'ellipse', cx: 3, cy: 5 }));
  } finally {
    session.dispose();
  }
});
