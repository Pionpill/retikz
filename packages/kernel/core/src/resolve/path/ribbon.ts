import type { RibbonWidthProfileDefinition } from '../../contract';
import type { IRJsonObject } from '../../schemas';
import type {
  CanonicalRibbonWidth,
  CanonicalStep,
  PathGeneratorResolution,
  PathResolution,
  PathResolveContext,
  RibbonPathResolution,
  RibbonWidthResolution,
} from './types';

import { providerDefinitionOf } from '../../providers/registry';
import { JsonObjectSchema } from '../../schemas';
import { parseProviderPayload } from '../provider-payload';
import { resolveArrowMarks, resolvePathGenerators } from './provider';

/** 解析 ribbon width profile、params，并确定动态宽度是否需要采样轮廓 */
export const resolveRibbonWidth = (
  width: CanonicalRibbonWidth | undefined,
  context: PathResolveContext,
  irPath: string,
): RibbonWidthResolution | undefined => {
  if (width === undefined) return undefined;
  if (typeof width === 'number') return { width, requiresSampling: false };
  if (width.kind === 'stops') return { width, requiresSampling: true };

  const definition: RibbonWidthProfileDefinition = providerDefinitionOf(context.ribbonWidthProfiles, width.name, {
    capability: 'ribbon width profile',
    optionName: 'ribbonWidthProfiles',
  });
  const paramsPath = `${irPath}.params`;
  const rawParams = width.params ?? {};
  const parsed = definition.paramsSchema
    ? parseProviderPayload({
        capability: 'ribbon width profile',
        providerName: width.name,
        irPath: paramsPath,
        payloadName: 'params',
        schema: definition.paramsSchema,
        value: rawParams,
      })
    : parseProviderPayload({
        capability: 'ribbon width profile',
        providerName: width.name,
        irPath: paramsPath,
        payloadName: 'params',
        schema: JsonObjectSchema,
        value: rawParams,
      });
  const params: IRJsonObject = parseProviderPayload({
    capability: 'ribbon width profile',
    providerName: width.name,
    irPath: paramsPath,
    payloadName: 'params',
    schema: JsonObjectSchema,
    value: parsed,
  });
  return { width, definition, params, requiresSampling: true };
};

/** 为 ribbon emitter 绑定其嵌套 stroke path 实际会消费的 provider */
export const resolveRibbonPathProviders = (
  resolution: PathResolution,
  context: PathResolveContext,
): RibbonPathResolution => {
  const ribbon = resolution.path.ribbon;
  const irPath = context.irPath ?? 'path';
  const generators = new Map<CanonicalStep, PathGeneratorResolution>();
  const emptyResolution = (): RibbonPathResolution => ({
    ...resolution,
    generators: new Map(),
    arrows: new Map(),
  });
  if (ribbon === undefined) return emptyResolution();
  if (
    (ribbon.mode === 'boundary' &&
      (resolution.path.label !== undefined || ribbon.upper === undefined || ribbon.lower === undefined)) ||
    (ribbon.mode !== 'boundary' && resolution.path.children === undefined)
  ) {
    return emptyResolution();
  }
  if (ribbon.mode === 'boundary') {
    for (const [step, provider] of resolvePathGenerators(ribbon.upper ?? [], context, `${irPath}.ribbon.upper`)) {
      generators.set(step, provider);
    }
    for (const [step, provider] of resolvePathGenerators(ribbon.lower ?? [], context, `${irPath}.ribbon.lower`)) {
      generators.set(step, provider);
    }
  } else {
    for (const [step, provider] of resolvePathGenerators(resolution.path.children ?? [], context, irPath)) {
      generators.set(step, provider);
    }
  }
  const marks = resolution.path.marks;
  const arrows = marks === undefined || marks.length === 0 ? new Map() : resolveArrowMarks(marks, context);
  const ribbonWidth = resolveRibbonWidth(ribbon.width, context, `${irPath}.ribbon.width`);
  return {
    ...resolution,
    generators,
    arrows,
    ...(ribbonWidth === undefined ? {} : { ribbonWidth }),
  };
};
