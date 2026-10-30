import { boundsToRect } from '@retikz/math';

import type { ScenePrimitive } from '../../contract';
import type { SharedCompileContext } from '../context';
import type { CompileOutput } from '../output';
import { assembleCompileOutputs } from '../output';
import type { CompileOwnerKey, CompileProvenanceTracker } from '../provenance';
import { collectLayoutBounds, optionalVisualBoundsOfPrimitives } from '../scene';
import { applyTransformChain } from '../transform';
import type { CompiledScope } from './types';

/** 用已编译 Scope 包装有序子输出，不在缓存状态中保存重复子树 */
export const assembleScopeOutput = (
  scope: CompiledScope,
  children: ReadonlyArray<CompileOutput>,
  shared: SharedCompileContext,
  provenance?: CompileProvenanceTracker,
  owner?: CompileOwnerKey,
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
