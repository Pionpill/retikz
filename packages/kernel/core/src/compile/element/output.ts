import { boundsToRect } from '@retikz/math';

import type { ScenePrimitive } from '../../contract';
import type { SharedCompileContext } from '../context';
import type { CompileProvenanceTracker } from '../orchestration';
import { collectLayoutBounds, optionalVisualBoundsOfPrimitives } from '../orchestration';
import type { CompileSemanticOwner } from '../orchestration';
import { createClipRegistry, createPaintRegistry, importSceneResources, remapPrimitiveResources } from '../resource';
import { applyTransformChain } from '../transform';
import type { CompiledScope, CompileOutput } from './types';

/** 按声明顺序导入局部输出及资源，不重新运行 provider */
export const assembleCompileOutputs = (
  outputs: ReadonlyArray<CompileOutput>,
  shared: SharedCompileContext,
  provenance?: CompileProvenanceTracker,
): CompileOutput => {
  const paint = createPaintRegistry(shared.layout.round);
  const clip = createClipRegistry(shared.layout.round, shared.limits.maxClipDepth);
  const fragments: Array<{ zIndex: number; primitives: Array<ScenePrimitive> }> = [];
  const bounds: Array<CompileOutput['bounds'][number]> = [];
  for (const output of outputs) {
    const ids = importSceneResources(output.resources, paint, clip);
    const primitives = output.primitives.map(primitive => remapPrimitiveResources(primitive, ids));
    provenance?.transferPrimitives(output.primitives, primitives);
    fragments.push({
      zIndex: output.zIndex ?? 0,
      primitives,
    });
    bounds.push(...output.bounds);
  }
  return Object.freeze({
    primitives: fragments.sort((a, b) => a.zIndex - b.zIndex).flatMap(fragment => fragment.primitives),
    resources: [...paint.resources(), ...clip.resources()],
    bounds,
  });
};

/** 用已编译 Scope 包装有序子输出，不在缓存状态中保存重复子树 */
export const assembleScopeOutput = (
  scope: CompiledScope,
  children: ReadonlyArray<CompileOutput>,
  shared: SharedCompileContext,
  provenance?: CompileProvenanceTracker,
  owner?: CompileSemanticOwner,
): CompileOutput => {
  const ownGroup = { ...scope.group, children: scope.output.primitives };
  const childOutput = assembleCompileOutputs(children, shared, provenance);
  const merged = assembleCompileOutputs(
    [childOutput, { ...scope.output, zIndex: undefined, primitives: [ownGroup] }],
    shared,
    provenance,
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
  if (owner !== undefined) provenance?.recordPrimitives(primitives, owner, 'scope');
  const bounds: Array<CompileOutput['bounds'][number]> = [];
  for (const child of children) {
    for (const contribution of child.bounds) {
      if (contribution.decoration) {
        const box = collectLayoutBounds(undefined, contribution.boundsPoints);
        if (box !== undefined) {
          const projected = optionalVisualBoundsOfPrimitives(
            [{ ...group, children: [{ type: 'rect', ...boundsToRect(box), fill: 'black' }] }],
            merged.resources,
          );
          if (projected !== undefined) {
            const { x, y, width, height } = projected;
            bounds.push({
              decoration: true,
              boundsPoints: [
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
        boundsPoints: contribution.boundsPoints.map(point => applyTransformChain(point, transforms)),
      });
    }
  }
  const decoration = optionalVisualBoundsOfPrimitives([{ ...group, children: frame }], merged.resources);
  if (decoration !== undefined) {
    const { x, y, width, height } = decoration;
    bounds.push({
      decoration: true,
      boundsPoints: [
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
  });
};
