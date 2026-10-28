import type {
  AnyCompositeDefinition,
  CompositeCompileContext,
  CompositeEvaluationResult,
  CompileOptions,
  IRChild,
} from '@retikz/core';
import { compileToScene } from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';
import type { BoundsRect } from '@retikz/math';

/** 在正常编译回调中读取根组件声明的分配，不改变输入或增加布局试算 */
export const compileMeasured = (child: IRChild, options: CompileOptions) => {
  if (!('namespace' in child)) throw new Error('Expected composite fixture');
  const definition = options.composites?.find(
    entry => entry.namespace === child.namespace && entry.type === child.type,
  );
  if (definition === undefined) throw new Error('Missing test composite definition');
  let allocationBounds: Readonly<BoundsRect> | undefined;
  let depth = 0;
  const wrap =
    <T extends JsonValue>(compile: (node: never, context: CompositeCompileContext) => CompositeEvaluationResult<T>) =>
    (node: never, context: CompositeCompileContext): CompositeEvaluationResult<T> => {
      depth++;
      try {
        const output = compile(node, context);
        if (depth === 1 && 'children' in output) allocationBounds = output.allocationBounds;
        return output;
      } finally {
        depth--;
      }
    };
  const measuredDefinition: AnyCompositeDefinition =
    definition.artifactSchema === undefined
      ? { ...definition, compile: wrap(definition.compile) }
      : { ...definition, compile: wrap(definition.compile) };
  const result = compileToScene(
    { version: 1, type: 'scene', children: [child] },
    { ...options, composites: options.composites?.map(entry => (entry === definition ? measuredDefinition : entry)) },
  );
  if (allocationBounds === undefined) throw new Error('No declared allocation');
  return { ...result, allocationBounds };
};
