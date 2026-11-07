import type { PropertyPath } from '@retikz/foundation';

import type { ClipDefinition } from '../../contract';
import type { ProviderRegistry } from '../../providers';
import { getProviderDefinition } from '../../providers';
import type { IRClip } from '../../schemas';
import { createCompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider';
import type { ClipResolution } from './types';

/** 解析裁剪配置所需的定义注册表与错误定位信息 */
type ClipResolveContext = Readonly<{
  /** 当前可用的裁剪定义注册表 */
  clipRegistry: ProviderRegistry<ClipDefinition>;
  /** 当前裁剪配置的 IR 路径，用于参数校验错误定位 */
  irPath?: PropertyPath;
}>;

/** 查找裁剪定义并按其 schema 解析配置，返回供编译阶段生成裁剪几何的绑定结果 */
export const resolveClip = (clip: IRClip, context: ClipResolveContext): ClipResolution => {
  const kind = clip.kind;
  const definition = getProviderDefinition(context.clipRegistry, kind);
  const params = parseProviderPayload({
    capability: 'clip',
    providerName: kind,
    irPath: context.irPath ?? [],
    payloadName: 'schema',
    schema: definition.schema,
    value: clip,
  });
  if (params.kind !== kind) {
    throw createCompositeContractError(
      `Clip provider 'clip:${kind}' schema returned kind '${String(params.kind)}' instead of '${kind}'.`,
    );
  }

  const resolve = (nested: IRClip): ClipResolution => resolveClip(nested, context);

  return { spec: clip, kind, definition, params, resolve };
};
