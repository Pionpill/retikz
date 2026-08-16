import type { AnyClipShapeDefinition, ClipShape } from '../../contract';
import type { IRJsonObject } from '../../schemas';
import type { ClipShapeResolution } from './types';

import { providerDefinitionOf } from '../../providers/registry';
import { JsonObjectSchema } from '../../schemas';
import { CompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider-payload';
import { withProviderOutputValidationBoundary } from '../provider-validation';

/** ClipShape provider 解析所需的 registry 和 locator 上下文 */
export type ClipShapeResolveContext = Readonly<{
  /** 有效 ClipShape provider registry */
  clipShapes: ReadonlyMap<string, AnyClipShapeDefinition>;
  /** 当前 shape locator，用于 schema diagnostics */
  irPath?: string;
}>;

/** 绑定 ClipShape Definition 并解析完整 shape snapshot */
export const resolveClipShape = (shape: ClipShape, context: ClipShapeResolveContext): ClipShapeResolution => {
  const kind = shape.kind;
  const definition = providerDefinitionOf(context.clipShapes, kind, {
    capability: 'clip shape',
    optionName: 'clipShapes',
  });
  const parsed = withProviderOutputValidationBoundary(`Clip shape '${kind}'`, () =>
    parseProviderPayload({
      capability: 'clip shape',
      providerName: kind,
      irPath: context.irPath ?? 'clip shape',
      payloadName: 'schema',
      schema: definition.schema,
      value: shape,
    }),
  );
  let params: IRJsonObject;
  try {
    params = JsonObjectSchema.parse(parsed);
  } catch (cause) {
    throw new CompositeContractError(`Clip shape '${kind}' schema returned a non-JSON payload.`, { cause });
  }
  if (params.kind !== kind) {
    throw new CompositeContractError(
      `Clip shape '${kind}' schema returned registry kind '${String(params.kind)}' instead of '${kind}'.`,
    );
  }
  return { spec: shape, kind, definition, params: params as ClipShape };
};
