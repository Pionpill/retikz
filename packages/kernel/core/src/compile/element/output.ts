import { boundsToRect } from '@retikz/math';

import type { ScenePrimitive } from '../../contract';
import type { CompileEnvironment } from '../environment';
import { collectLayoutBounds } from '../orchestration';
import { optionalVisualBoundsOfPrimitives } from '../orchestration';
import { createClipRegistry, createPaintRegistry, remapPrimitiveResources } from '../resource';
import { applyTransformChain } from '../transform';
import type { CompiledScope, CompileOutput } from './types';

/** 按声明顺序导入局部输出及资源，不重新运行 provider */
export const assembleCompileOutputs = (
  outputs: ReadonlyArray<CompileOutput>,
  environment: CompileEnvironment,
): CompileOutput => {
  const paint = createPaintRegistry(environment.round);
  const clip = createClipRegistry(environment.round, environment.clips, environment.maxClipDepth);
  const fragments: Array<{ zIndex: number; primitives: Array<ScenePrimitive> }> = [];
  const bounds: Array<CompileOutput['bounds'][number]> = [];
  const nodeLayouts: Array<NonNullable<CompileOutput['nodeLayouts']>[number]> = [];
  const observations: Array<NonNullable<CompileOutput['observations']>[number]> = [];
  for (const output of outputs) {
    const ids = new Map<string, string>();
    for (const resource of output.resources) {
      if (resource.kind === 'paint') {
        const imported = paint.importResolved(resource);
        if (typeof imported === 'object' && imported.kind === 'resourceRef') ids.set(resource.id, imported.id);
      } else {
        ids.set(resource.id, clip.importPath(resource.path));
      }
    }
    fragments.push({
      zIndex: output.zIndex ?? 0,
      primitives: output.primitives.map(primitive => remapPrimitiveResources(primitive, ids)),
    });
    bounds.push(...output.bounds);
    nodeLayouts.push(...(output.nodeLayouts ?? []));
    observations.push(...(output.observations ?? []));
  }
  return Object.freeze({
    primitives: fragments.sort((a, b) => a.zIndex - b.zIndex).flatMap(fragment => fragment.primitives),
    resources: [...paint.resources(), ...clip.resources()],
    bounds,
    nodeLayouts,
    observations,
  });
};

/** 用已编译 Scope 包装有序子输出，不在缓存状态中保存重复子树 */
export const assembleScopeOutput = (
  scope: CompiledScope,
  children: ReadonlyArray<CompileOutput>,
  environment: CompileEnvironment,
): CompileOutput => {
  const ownGroup = { ...scope.group, children: scope.output.primitives };
  const childOutput = assembleCompileOutputs(children, environment);
  const merged = assembleCompileOutputs(
    [childOutput, { ...scope.output, zIndex: undefined, primitives: [ownGroup] }],
    environment,
  );
  const group = merged.primitives[merged.primitives.length - 1] as typeof ownGroup;
  const frame = group.children;
  const nested = merged.primitives.slice(0, -1);
  const transforms = group.transforms ?? [];
  const prunable =
    frame.length === 0 &&
    nested.length === 0 &&
    transforms.length === 0 &&
    group.id === undefined &&
    group.clipRef === undefined;
  const primitives: Array<ScenePrimitive> = prunable ? [] : [{ ...group, children: [...frame, ...nested] }];
  const bounds: Array<CompileOutput['bounds'][number]> = [];
  for (const child of children) {
    for (const contribution of child.bounds) {
      if (contribution.decoration) {
        const box = collectLayoutBounds(undefined, contribution.points);
        if (box !== undefined) {
          const projected = optionalVisualBoundsOfPrimitives(
            [{ ...group, children: [{ type: 'rect', ...boundsToRect(box), fill: 'black' }] }],
            merged.resources,
          );
          if (projected !== undefined) {
            const { x, y, width, height } = projected;
            bounds.push({
              decoration: true,
              points: [
                [x, y],
                [x + width, y],
                [x, y + height],
                [x + width, y + height],
              ],
            });
          }
        }
        continue;
      }
      bounds.push({
        ...contribution,
        points: contribution.points.map(point => applyTransformChain(point, transforms)),
      });
    }
  }
  const decoration = optionalVisualBoundsOfPrimitives([{ ...group, children: frame }], merged.resources);
  if (decoration !== undefined) {
    const { x, y, width, height } = decoration;
    bounds.push({
      decoration: true,
      points: [
        [x, y],
        [x + width, y],
        [x, y + height],
        [x + width, y + height],
      ],
    });
  }
  return Object.freeze({
    primitives,
    resources: merged.resources,
    bounds,
    zIndex: scope.output.zIndex,
    nodeLayouts: merged.nodeLayouts?.map(entry => ({ ...entry, scopeChain: [...transforms, ...entry.scopeChain] })),
    observations: merged.observations?.map(entry => ({ ...entry, scopeChain: [...transforms, ...entry.scopeChain] })),
  });
};
