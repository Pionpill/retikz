import type {
  AnyCompositeDefinition,
  CompositeExpandContext,
  CompositeExpandResult,
  ThemeStyleDefinition,
} from '../../contract';
import type { IRChild, IRScene } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
import type { LoweredIRScene } from '../types';
import type { CompileWarningInput } from '../warning';

import { parseProviderPayload } from '../../resolve/provider-payload';
import { DEFAULT_RESOLVED_THEME, resolveTheme } from '../../resolve/theme';
import { CompileWarningCode } from '../constants';
import { CompileInvariantError } from '../probe-failure';
import { validateExpandCompositeOutput } from './composite-output';

/** composite 嵌套展开最大深度 */
export const DEFAULT_MAX_COMPOSITE_DEPTH = 32;

type LowerOptions = {
  onWarn: (warning: CompileWarningInput) => void;
  themeStyles?: ReadonlyMap<string, ThemeStyleDefinition>;
  /** 未注册 composite 的 fail-loud 钩子；缺省继续走 compile warning + skip */
  onUnregistered?: (key: string, path: string) => never;
  /**
   * composite 嵌套展开最大深度
   * @default DEFAULT_MAX_COMPOSITE_DEPTH (32)
   */
  maxDepth?: number;
};

type CallableExpandDefinition = {
  schema: AnyCompositeDefinition['schema'];
  expand: (node: unknown, context: CompositeExpandContext) => CompositeExpandResult;
};

/** 只在紧邻 schema parse 的边界恢复已擦除 expand callback */
const callableExpandDefinition = (definition: AnyCompositeDefinition): CallableExpandDefinition => {
  if (definition.expand === undefined) {
    throw new CompileInvariantError('internal: callableExpandDefinition received a layout-aware composite');
  }
  return definition as unknown as CallableExpandDefinition;
};

const lowerCompositeTree = (
  ir: IRScene,
  registry: ReadonlyMap<string, AnyCompositeDefinition>,
  options: LowerOptions,
): IRScene => {
  const { onWarn, onUnregistered, maxDepth = DEFAULT_MAX_COMPOSITE_DEPTH, themeStyles } = options;
  const rootTheme = resolveTheme(DEFAULT_RESOLVED_THEME, ir.theme, 'scene.theme', themeStyles);

  const expandList = (
    children: ReadonlyArray<IRChild>,
    depth: number,
    path: string,
    theme: ResolvedTheme,
  ): Array<IRChild> => children.flatMap((child, index) => expandChild(child, depth, `${path}[${index}]`, theme));

  const expandChild = (child: IRChild, depth: number, path: string, theme: ResolvedTheme): Array<IRChild> => {
    if ('namespace' in child) {
      const key = `${child.namespace}.${child.type}`;
      const definition = registry.get(key);
      if (!definition) {
        onUnregistered?.(key, path);
        onWarn({
          code: CompileWarningCode.CompositeNotRegistered,
          message: `No composite registered for '${key}'; the node is skipped.`,
          path,
        });
        return [];
      }
      if (depth >= maxDepth) {
        throw new Error(
          `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${maxDepth} levels at ${path} (cyclic or runaway expand?)`,
        );
      }
      if (definition.expand === undefined) {
        throw new Error(
          `lowerIRToKernel: composite '${key}' at ${path} requires layout-aware compile and cannot be lowered without the full compile environment.`,
        );
      }
      const callable = callableExpandDefinition(definition);
      const parsed = parseProviderPayload({
        capability: 'composite',
        providerName: key,
        irPath: path,
        payloadName: 'payload',
        schema: callable.schema,
        value: child,
      });
      const produced = callable.expand(parsed, Object.freeze({ theme }));
      const result = validateExpandCompositeOutput(`Composite '${key}' at ${path}`, produced);
      if ((result.spatialHandles?.length ?? 0) > 0) {
        throw new Error(
          `lowerIRToKernel: composite '${key}' at ${path} declared spatial handles; use compileToScene() to obtain settled world-space geometry.`,
        );
      }
      return expandList(result.children, depth + 1, `${path}::expand`, theme);
    }
    if (child.type === 'scope') {
      const scopeTheme = resolveTheme(theme, child.theme, `${path}.theme`, themeStyles);
      return [{ ...child, children: expandList(child.children, depth, `${path}.children`, scopeTheme) }];
    }
    return [child];
  };

  return { ...ir, children: expandList(ir.children, 0, 'children', rootTheme) };
};

/** 把 composite 节点完整展开为 Tier 1 IR；layout-aware 分支 fail-loud */
export const lowerComposites = (
  ir: IRScene,
  registry: ReadonlyMap<string, AnyCompositeDefinition>,
  options: LowerOptions,
): LoweredIRScene => lowerCompositeTree(ir, registry, options) as LoweredIRScene;
