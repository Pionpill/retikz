import type { DataTransformImplementationProvider } from '@retikz/data';

import { scaleField } from './extension-transform-preview';

/** 只支持已知scale-field语义的Promise计算入口 */
export const createScaleFieldProvider = (onComplete: () => void): DataTransformImplementationProvider<never> => ({
  resolve: (stage, context) => {
    if (stage.definition !== scaleField || context.input.kind !== 'result')
      return {
        kind: 'unsupported',
        diagnostics: [{ code: 'UNSUPPORTED', message: 'This provider supports scale-field on canonical rows only' }],
      };

    const operation = scaleField.schema.parse(stage.operation);

    return {
      kind: 'supported',
      implementation: {
        definition: stage.definition,
        execute: async input => {
          await Promise.resolve();
          if (input.kind !== 'result') throw new Error('Expected canonical rows');

          const result = {
            rows: input.result.rows.map(row => ({
              ...row,
              [operation.params.as]: Number(row[operation.params.field]) * operation.params.factor,
            })),
            model: stage.outputModel,
          };
          onComplete();

          return result;
        },
      },
    };
  },
});
