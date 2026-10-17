import type { JsonValue } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { CompositeCompileContext, CompositeEvaluationResult } from '../../contract';
import type { IRComposite } from '../../schemas';
import { parseProviderPayload } from '../provider-payload';
import type { CompositeBinding, CompositeRegistry, CompositeResolution, RegisteredCompositeBinding } from './types';

type CallableComposite = Readonly<{
  schema: ZodType;
  compile: (node: unknown, context: CompositeCompileContext) => CompositeEvaluationResult<JsonValue>;
  artifactSchema?: ZodType<JsonValue>;
}>;

/** 绑定 composite provider key、definition 与可执行分支 */
export const bindComposite = (source: IRComposite, composites: CompositeRegistry): CompositeBinding => {
  const key = `${source.namespace}.${source.type}`;
  const definition = composites.get(key);
  if (definition === undefined) return { kind: 'unregistered', key };
  const callable = definition as unknown as CallableComposite;

  return {
    kind: 'compile',
    key,
    namespace: definition.namespace,
    type: definition.type,
    source,
    schema: callable.schema,
    compile: callable.compile,
    ...(callable.artifactSchema === undefined ? {} : { artifactSchema: callable.artifactSchema }),
  };
};

/**
 * 按已绑定 provider schema 解析 composite payload
 * @template TBinding 关联已注册定义、输入与执行分支的组件绑定类型
 */
export const resolveComposite = <TBinding extends RegisteredCompositeBinding>(
  binding: TBinding,
  irPath: string,
): CompositeResolution<TBinding> => ({
  ...binding,
  node: parseProviderPayload({
    capability: 'composite',
    providerName: binding.key,
    irPath,
    payloadName: 'payload',
    schema: binding.schema,
    value: binding.source,
  }),
});
