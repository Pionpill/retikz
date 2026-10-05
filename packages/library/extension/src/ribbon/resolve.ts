import type { JsonObject } from '@retikz/foundation';
import { JsonObjectSchema } from '@retikz/foundation';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import type { RibbonWidthProfileDefinition } from './profile-types';
import type { CanonicalRibbonOptions, CanonicalRibbonWidth } from './types';

/** Ribbon 宽度在 compile 阶段绑定的 profile 与参数 */
export type RibbonWidthResolution = Readonly<{
  width: CanonicalRibbonWidth;
  definition?: RibbonWidthProfileDefinition;
  params?: JsonObject;
}>;

/** 对已解析的节点宽度排序，保留模式分支与 Schema 默认值 */
export const resolveRibbonOptions = (options: CanonicalRibbonOptions): CanonicalRibbonOptions => {
  if (options.mode === 'boundary' || options.width.kind !== 'stops') return options;

  return {
    ...options,
    width: { ...options.width, stops: [...options.width.stops].sort((a, b) => a.offset - b.offset) },
  };
};

/** 解析 Ribbon 宽度 profile 与参数 */
export const resolveRibbonWidth = (
  width: CanonicalRibbonWidth,
  profiles: ReadonlyMap<string, RibbonWidthProfileDefinition>,
  irPath: string,
): RibbonWidthResolution => {
  if (width.kind !== 'profile') return { width };

  const definition = profiles.get(width.name);
  if (definition === undefined) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.ResolutionInvalid,
      message: `Unknown Ribbon width profile '${width.name}' at ${irPath}.`,
      details: { name: width.name, path: irPath },
    });
  }

  const paramsPath = `${irPath}.params`;
  const rawParams = width.params ?? {};
  let params: JsonObject;

  try {
    params = definition.paramsSchema?.parse(rawParams) ?? JsonObjectSchema.parse(rawParams);
  } catch (cause) {
    throw new RetikzExtensionError({
      code: RetikzExtensionErrorCode.ResolutionInvalid,
      message: `Ribbon width profile '${width.name}' params are invalid at ${paramsPath}.`,
      details: { name: width.name, path: paramsPath },
      cause,
    });
  }

  return { width, definition, params };
};
