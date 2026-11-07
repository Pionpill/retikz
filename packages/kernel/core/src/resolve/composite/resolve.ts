import type { PropertyPath } from '@retikz/foundation';

import type { IRComposite } from '../../schemas';
import { parseProviderPayload } from '../provider';
import type { CompositeBinding, CompositeRegistry, CompositeResolution, RegisteredCompositeBinding } from './types';

/** 按命名空间和类型查找复合组件定义，返回已注册绑定或未注册标记 */
export const bindComposite = (source: IRComposite, composites: CompositeRegistry): CompositeBinding => {
  const key = `${source.namespace}.${source.type}`;
  const definition = composites.get(source.namespace)?.get(source.type);
  if (definition === undefined) return { kind: 'unregistered', key };

  return {
    kind: 'compile',
    key,
    namespace: definition.namespace,
    type: definition.type,
    source,
    schema: definition.schema,
    // resolveComposite 使用同一定义的 schema 解析节点后，才交给此回调
    compile: definition.compile as RegisteredCompositeBinding['compile'],
    ...(definition.artifactSchema === undefined ? {} : { artifactSchema: definition.artifactSchema }),
  };
};

/**
 * 按已绑定定义的 schema 解析复合组件节点，保留后续编译所需的定义信息
 * @template TBinding 已注册的组件绑定类型，解析结果保留该绑定的字段
 */
export const resolveComposite = <TBinding extends RegisteredCompositeBinding>(
  binding: TBinding,
  irPath: PropertyPath,
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
