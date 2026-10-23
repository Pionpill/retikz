import type { AnyPathKindDefinition, StrokePathOwnerOutput } from '../contract';
import { definePathKind } from '../contract';
import type { IRPathBase } from '../schemas';
import { BuiltinPathKind, StrokePathSchema } from '../schemas';
import { createProviderRegistry } from './registry';

/** 标准描边 path kind：复用 core 的 stroke emission */
const strokePathKind = definePathKind<IRPathBase, StrokePathOwnerOutput>({
  name: BuiltinPathKind.Stroke,
  schema: StrokePathSchema,
  ownerOutput: true,
  compile: context =>
    context.ownerOutput.requested
      ? context.emitStroke(context.path, {
          captureOwnerOutput: value => context.ownerOutput.publish(value),
        })
      : context.emitStroke(context.path),
});

/** 内置 path kind provider 注册项 */
export const BUILTIN_PATH_KINDS: ReadonlyMap<string, AnyPathKindDefinition> = new Map([
  [strokePathKind.name, strokePathKind],
]);

const keyOfPathKind = (definition: AnyPathKindDefinition): string => definition.name;

/** 解析 path-kind provider 注册表：按 schema kind 合并内置项与自定义项并诊断冲突 */
export const resolvePathKindRegistry = (
  pathKinds?: ReadonlyArray<AnyPathKindDefinition>,
): ReadonlyMap<string, AnyPathKindDefinition> =>
  createProviderRegistry({
    capability: 'path kind',
    builtins: BUILTIN_PATH_KINDS,
    custom: pathKinds,
    keyOf: keyOfPathKind,
  });
