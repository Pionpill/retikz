import type { ClipDefinition, ClipShape } from '../../contract';
import type { IRClip, IRJsonObject } from '../../schemas';
import type { ClipResolution, ClipShapeResolution } from './types';

import { providerDefinitionOf } from '../../providers/registry';
import { JsonObjectSchema } from '../../schemas';
import { RetikzCompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider-payload';
import { withProviderOutputValidationBoundary } from '../provider-validation';

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
    throw new RetikzCompositeContractError(`Clip provider 'clip:${kind}' schema returned a non-JSON payload.`, {
      cause,
    });
  }
  if (params.kind !== kind) {
    throw new RetikzCompositeContractError(
      `Clip provider 'clip:${kind}' schema returned kind '${String(params.kind)}' instead of '${kind}'.`,
    );
  }
  const resolve = (nested: IRClip): ClipResolution => resolveClip(nested, context);
  return { spec: clip, kind, definition, params, resolve };
};

/** 通过同一个 Clip registry 绑定 definition 并校验完整 shape snapshot */
export const resolveClipShape = (shape: ClipShape, context: ClipResolveContext): ClipShapeResolution => {
  const kind = shape.kind;
  const definition = providerDefinitionOf(context.clips, kind, { capability: 'clip', optionName: 'clips' });
  const parsed = withProviderOutputValidationBoundary(`Clip provider 'clip:${kind}'`, () =>
    parseProviderPayload({
      capability: 'clip',
      providerName: kind,
      irPath: context.irPath ?? 'clip shape',
      payloadName: 'shapeSchema',
      schema: definition.shapeSchema,
      value: shape,
    }),
  );
  let params: IRJsonObject;
  try {
    params = JsonObjectSchema.parse(parsed);
  } catch (cause) {
    throw new RetikzCompositeContractError(`Clip provider 'clip:${kind}' shapeSchema returned a non-JSON payload.`, {
      cause,
    });
  }
  if (params.kind !== kind) {
    throw new RetikzCompositeContractError(
      `Clip provider 'clip:${kind}' shapeSchema returned kind '${String(params.kind)}' instead of '${kind}'.`,
    );
  }
  return { spec: shape, kind, definition, params: params as ClipShape };
};
