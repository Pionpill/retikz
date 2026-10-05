import type {
  AnyCompositeDefinition,
  ThemeStyleDefinition,
  CompositeBoundChild,
  CompositeInputBindings,
} from '../../contract';
import type { CompositeRuntimeInputScope } from '../../contract/composite';
import {
  captureCompositeInputScope,
  resolveCompositeInputScope,
  selectCompositeInputScope,
} from '../../contract/composite';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { bindComposite, DEFAULT_RESOLVED_THEME, resolveComposite, resolveTheme } from '../../resolve';
import { createCompositeContractError } from '../../resolve/diagnostics';
import type { IRChild, IRScene } from '../../schemas';
import type { ResolvedTheme } from '../../shared';
import { CompileWarningCode } from '../constants';
import type { LoweredIRScene } from '../types';
import type { CompileWarningInput } from '../warning';
import { snapshotCompositeLayoutChild, validateExpandCompositeOutput } from './composite-output';

/** composite 嵌套展开最大深度 */
export const DEFAULT_MAX_COMPOSITE_DEPTH = 32;

type LowerOptions = {
  compositeInputs?: CompositeInputBindings;
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
    inputs?: CompositeRuntimeInputScope,
  ): Array<IRChild> =>
    children.flatMap((child, index) =>
      expandChild(
        child,
        depth,
        `${path}[${index}]`,
        theme,
        inputs === undefined ? undefined : selectCompositeInputScope(inputs, ['children', index]),
      ),
    );

  const expandChild = (
    child: IRChild,
    depth: number,
    path: string,
    theme: ResolvedTheme,
    inputs?: CompositeRuntimeInputScope,
  ): Array<IRChild> => {
    if ('namespace' in child) {
      const binding = bindComposite(child, registry);
      const { key } = binding;
      if (binding.kind === 'unregistered') {
        onUnregistered?.(key, path);
        onWarn({
          code: CompileWarningCode.CompositeNotRegistered,
          message: `No composite registered for '${key}'; the node is skipped.`,
          path,
        });

        return [];
      }

      if (depth >= maxDepth) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${maxDepth} levels at ${path} (cyclic or runaway expand?)`,
        );
      }

      if (binding.kind === 'compile') {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `lowerIRToKernel: composite '${key}' at ${path} requires layout-aware compile and cannot be lowered without the full compile environment.`,
        );
      }

      const resolution = resolveComposite(binding, path);
      const sourceInputs = inputs ?? { source: child, bindings: [] };
      const boundChildren = new Map<CompositeBoundChild, CompositeRuntimeInputScope>();
      const authoredChildren = new Map<string, CompositeBoundChild>();

      const bindScope = (scope: CompositeRuntimeInputScope): CompositeBoundChild => {
        snapshotCompositeLayoutChild(key, scope.source, 0);
        const handle = Object.freeze({}) as CompositeBoundChild;
        boundChildren.set(handle, scope);

        return handle;
      };

      const produced = resolution.expand(
        resolution.node,
        Object.freeze({
          theme,
          runtimeInput: sourceInputs.bindings.find(input => input.path.length === 0)?.input,
          sourceChild: childPath => {
            const pathKey = JSON.stringify(childPath);
            const existing = authoredChildren.get(pathKey);
            if (existing !== undefined) return existing;

            const selected = bindScope(selectCompositeInputScope(sourceInputs, childPath));
            authoredChildren.set(pathKey, selected);

            return selected;
          },
          bindChild: (nextChild, bindings) => bindScope(captureCompositeInputScope(nextChild, bindings)),
        }),
      );

      const outputInputs = new Map<number, CompositeRuntimeInputScope>();
      const consumed = new Set<CompositeBoundChild>();
      const result = validateExpandCompositeOutput(`Composite '${key}' at ${path}`, produced, (output, index) => {
        const bound = boundChildren.get(output as CompositeBoundChild);
        if (bound === undefined) return snapshotCompositeLayoutChild(key, output, index);
        if (consumed.has(output as CompositeBoundChild))
          throw createCompositeContractError('Bound child may not be placed more than once');

        consumed.add(output as CompositeBoundChild);
        outputInputs.set(index, bound);

        return snapshotCompositeLayoutChild(key, bound.source, index);
      });
      if ((result.spatialHandles?.length ?? 0) > 0) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `lowerIRToKernel: composite '${key}' at ${path} declared spatial handles; use compileToScene() to obtain settled world-space geometry.`,
        );
      }

      return result.children.flatMap((output, index) =>
        expandChild(
          snapshotCompositeLayoutChild(key, output, index),
          depth + 1,
          `${path}::expand[${index}]`,
          theme,
          outputInputs.get(index),
        ),
      );
    }

    if (child.type === 'scope') {
      const scopeTheme = resolveTheme(theme, child.theme, `${path}.theme`, themeStyles);
      return [{ ...child, children: expandList(child.children, depth, `${path}.children`, scopeTheme, inputs) }];
    }

    return [child];
  };

  return {
    ...ir,
    children: expandList(
      ir.children,
      0,
      'children',
      rootTheme,
      resolveCompositeInputScope(ir, options.compositeInputs),
    ),
  };
};

/** 把 composite 节点完整展开为 Tier 1 IR；layout-aware 分支 fail-loud */
export const lowerComposites = (
  ir: IRScene,
  registry: ReadonlyMap<string, AnyCompositeDefinition>,
  options: LowerOptions,
): LoweredIRScene => lowerCompositeTree(ir, registry, options) as LoweredIRScene;
