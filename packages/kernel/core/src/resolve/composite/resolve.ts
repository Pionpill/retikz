import type { ZodType } from 'zod';

import type {
  CompositeExpandContext,
  CompositeExpandResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
} from '../../contract';
import type { IRComposite, JsonValue } from '../../schemas';
import type { CompositeBinding, CompositeRegistry, CompositeResolution, RegisteredCompositeBinding } from './types';

import { parseProviderPayload } from '../provider-payload';

type CallableExpandComposite = Readonly<{
  schema: ZodType;
  expand: (node: unknown, context: CompositeExpandContext) => CompositeExpandResult;
}>;

type CallableLayoutComposite = Readonly<{
  schema: ZodType;
  compile: (node: unknown, context: LayoutCompositeCompileContext) => LayoutCompositeCompileResult<JsonValue>;
  artifactSchema?: ZodType<JsonValue>;
}>;

/** 绑定 composite provider key、definition 与可执行分支 */
export const bindComposite = (source: IRComposite, composites: CompositeRegistry): CompositeBinding => {
  const key = `${source.namespace}.${source.type}`;
  const definition = composites.get(key);
  if (definition === undefined) return { kind: 'unregistered', key };
  if (definition.expand !== undefined) {
    const callable = definition as unknown as CallableExpandComposite;
    return {
      kind: 'expand',
      key,
      namespace: definition.namespace,
      type: definition.type,
      source,
      schema: callable.schema,
      expand: callable.expand,
    };
  }
  const callable = definition as unknown as CallableLayoutComposite;
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

/** 按已绑定 provider schema 解析 composite payload */
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
