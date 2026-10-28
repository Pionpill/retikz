import type { AnyPathDefinition } from '../contract';
import { definePath } from '../contract';
import type { IRPathBase } from '../schemas';
import { BuiltinPath, StrokePathSchema } from '../schemas';
import { createProviderRegistry } from './registry';

/** 标准描边 path：复用 core 的 stroke emission */
const strokePath = definePath<IRPathBase>({
  name: BuiltinPath.Stroke,
  schema: StrokePathSchema,
  compile: context => context.emitStroke(context.path),
});

/** 内置 path provider 注册项 */
export const BUILTIN_PATHS: ReadonlyMap<string, AnyPathDefinition> = new Map([[strokePath.name, strokePath]]);

const keyOfPath = (definition: AnyPathDefinition): string => definition.name;

/** 解析路径定义注册表，合并内置项与自定义项并诊断命名冲突 */
export const resolvePathRegistry = (paths?: ReadonlyArray<AnyPathDefinition>): ReadonlyMap<string, AnyPathDefinition> =>
  createProviderRegistry({
    capability: 'path',
    builtins: BUILTIN_PATHS,
    custom: paths,
    keyOf: keyOfPath,
  });
