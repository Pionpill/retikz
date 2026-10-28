import { BUILTIN_PATHS } from '@retikz/core';
import type {
  IRPathBase,
  PathCompileContext,
  PathCompileResult,
  PathDefinition,
  StrokePathOwnerOutput,
} from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';

// 注册表擦除了泛型；已知内置 stroke definition 的实际 subject / owner output
const stroke = BUILTIN_PATHS.get('stroke')! as PathDefinition<IRPathBase, StrokePathOwnerOutput>;
for (const requested of [false, true])
  for (const empty of [false, true]) {
    defineBenchmark(
      {
        id: `providers/path/stroke/${requested}/${empty}`,
        dimensions: ['Path dispatch', requested ? '请求owner output' : '普通输出', empty ? '空结果' : '固定宿主结果'],
      },
      () => {
        const path: IRPathBase = { type: 'path', children: [] };
        const output: StrokePathOwnerOutput = {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [10, 0] },
          ],
          transforms: [],
        };
        const result: PathCompileResult | null = empty
          ? null
          : {
              primitives: [{ type: 'path', commands: output.commands }],
              boundsPoints: [
                [0, 0],
                [10, 0],
              ],
            };
        let published: StrokePathOwnerOutput | undefined;
        let receivedPath: IRPathBase | undefined;
        let captureRequested = false;
        const context: PathCompileContext<IRPathBase, StrokePathOwnerOutput> = {
          path,
          ownerOutput: {
            requested,
            publish: value => {
              published = value;
            },
          },
          emitStroke: (subject, options) => {
            receivedPath = subject;
            captureRequested = options !== undefined;
            published = undefined;
            if (!empty) options?.captureOwnerOutput(output);
            return result;
          },
          materializePath: () => [],
          resolveHostLabel: label => label,
          emitHostLabels: () => [],
          emitBoundaryLabels: () => [],
          wrapOutput: value => value,
          appearance: {},
          round: Math.round,
        };
        return {
          // 只测 provider 委托及捕获回调；真实 stroke 编译不属于本轮范围
          run: () => stroke.compile(context),
          verify: actual => {
            expect(actual).toBe(result);
            expect(receivedPath).toBe(path);
            expect(captureRequested).toBe(requested);
            expect(published).toBe(requested && !empty ? output : undefined);
          },
        };
      },
    );
  }
