import { BUILTIN_PATHS } from '@retikz/core';
import type { IRPathBase, PathDefinitionCompileContext, PathCompileResult, PathDefinition } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolvePathLabelContent, resolvePathLabelColors } from '../../src/resolve';

// 注册表擦除了泛型；此处验证已知的内置 stroke 委托契约
const stroke = BUILTIN_PATHS.get('stroke')! as PathDefinition<IRPathBase>;
for (const empty of [false, true]) {
  defineBenchmark(
    {
      id: `providers/path/stroke/${empty}`,
      dimensions: ['Path dispatch', empty ? '空结果' : '固定宿主结果', '单次委托'],
    },
    () => {
      const path: PathDefinitionCompileContext['path'] = { type: 'path', children: [] };
      const result: PathCompileResult | null = empty
        ? null
        : {
            primitives: [
              {
                type: 'path',
                commands: [
                  { kind: 'move', to: [0, 0] },
                  { kind: 'line', to: [10, 0] },
                ],
              },
            ],
            boundsPoints: [
              [0, 0],
              [10, 0],
            ],
          };
      let receivedPath: IRPathBase | undefined;
      const context: PathDefinitionCompileContext = {
        path,
        emitStroke: subject => {
          receivedPath = subject;
          return result;
        },
        materializePath: () => [],
        resolveHostLabel: label =>
          resolvePathLabelContent(resolvePathLabelColors(label, undefined, 'light', []), false, {
            rootFontSize: 16,
            gatingOn: false,
          }),
        emitHostLabels: () => [],
        emitBoundaryLabels: () => [],
        wrapOutput: value => value,
        appearance: { strokeEnabled: false },
        round: Math.round,
      };
      return {
        run: () => stroke.compile(context),
        verify: actual => {
          expect(actual).toBe(result);
          expect(receivedPath).toBeUndefined();
        },
      };
    },
  );
}
