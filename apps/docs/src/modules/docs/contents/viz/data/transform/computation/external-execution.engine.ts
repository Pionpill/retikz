import { applyTransforms, BuiltinDataTransform, resolveTransformRegistry, SortTransformSchema } from '@retikz/data';
import type { DataTransformImplementationProvider } from '@retikz/data';

const sortDefinition = resolveTransformRegistry().get(BuiltinDataTransform.Sort);

/** 用 Promise 演示已适配的内置 sort，复用排序算法以保持比较和缺失值语义 */
export const createSortProvider = (onComplete: () => void): DataTransformImplementationProvider<never> => ({
  resolve: (stage, context) => {
    if (stage.definition !== sortDefinition || context.input.kind !== 'result')
      return {
        kind: 'unsupported',
        diagnostics: [{ code: 'UNSUPPORTED', message: 'This provider supports built-in sort on canonical rows only' }],
      };

    const operation = SortTransformSchema.parse(stage.operation);
    return {
      kind: 'supported',
      implementation: {
        definition: stage.definition,
        execute: async input => {
          await Promise.resolve();
          if (input.kind !== 'result') throw new Error('Expected canonical rows');
          const result = {
            rows: applyTransforms(input.result.rows, [operation]).rows,
            model: input.result.model,
          };
          onComplete();
          return result;
        },
      },
    };
  },
});
