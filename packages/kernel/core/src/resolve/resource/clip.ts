import type { ClipDefinition } from '../../contract';
import type { IRClip, IRJsonObject } from '../../schemas';
import type { ClipResolution } from './types';

import { providerDefinitionOf } from '../../providers/registry';
import { JsonObjectSchema } from '../../schemas';
import { CompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider-payload';

/** Clip provider 解析所需的 registry 和 locator 上下文 */
export type ClipResolveContext = Readonly<{
  /** 有效 clip provider registry */
  clips: ReadonlyMap<string, ClipDefinition>;
  /** 当前 IR locator，用于 schema diagnostics */
  irPath?: string;
}>;

/** 绑定 definition 并解析 provider params；provider resolve 保留到 compile resource 阶段执行 */
export const resolveClip = (clip: IRClip, context: ClipResolveContext): ClipResolution => {
  const kind = clip.kind;
  const definition = providerDefinitionOf(context.clips, kind, { capability: 'clip', optionName: 'clips' });
  const parsed = parseProviderPayload({
    capability: 'clip',
    providerName: kind,
    irPath: context.irPath ?? 'clip',
    payloadName: 'schema',
    schema: definition.schema,
    value: clip,
  });
  let params: IRJsonObject;
  try {
    params = JsonObjectSchema.parse(parsed);
  } catch (cause) {
    throw new CompositeContractError(`Clip '${kind}' schema returned a non-JSON payload.`, { cause });
  }
  const resolve = (nested: IRClip): ClipResolution => resolveClip(nested, context);
  return { spec: clip, kind, definition, params, resolve };
};
