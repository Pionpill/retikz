import type { BoundsRect } from '@retikz/math';

import { boundsOf, boundsToRect } from '@retikz/math';

import type {
  CompileOccurrenceLocator,
  QualifiedSpatialHandle,
  SpatialHandleDeclaration,
  SpatialHandleIndex,
  SpatialHandleOwner,
  Transform,
} from '../../contract';
import type { IRPosition } from '../../schemas';

import { applyTransformChain } from '../transform';
import { canonicalizeBoundsRect } from './bounds';

/** world-space 物化前沿 traversal / Scope / replay 传递的空间声明 */
export type PendingSpatialHandle = {
  /** 从外到内的 composite owner path */
  ownerPath: ReadonlyArray<SpatialHandleOwner>;
  /** 已在 callback boundary 校验并冻结的 local declaration */
  declaration: SpatialHandleDeclaration;
  /** replay / remap 后的最终 declaration occurrence */
  finalOccurrence: CompileOccurrenceLocator;
  /** 首次声明 occurrence */
  originOccurrence: CompileOccurrenceLocator;
  /** 从 declaration local coordinate 到 world 的最终 transform chain */
  scopeChain: Array<Transform>;
};

const freezeOccurrence = (occurrence: CompileOccurrenceLocator): CompileOccurrenceLocator =>
  Object.freeze({
    sourcePath: occurrence.sourcePath,
    expansionPath: Object.freeze(occurrence.expansionPath.map(segment => Object.freeze({ ...segment }))),
  });

const isOccurrenceWithin = (candidate: CompileOccurrenceLocator, origin: CompileOccurrenceLocator): boolean =>
  candidate.sourcePath === origin.sourcePath &&
  candidate.expansionPath.length >= origin.expansionPath.length &&
  origin.expansionPath.every(
    (segment, index) =>
      segment.kind === candidate.expansionPath[index]?.kind && segment.index === candidate.expansionPath[index]?.index,
  );

/** 把 probe occurrence 的后缀映射到最终 replay site */
export const remapSpatialOccurrenceForReplay = (
  parent: CompileOccurrenceLocator,
  outputIndex: number,
  origin: CompileOccurrenceLocator,
  candidate: CompileOccurrenceLocator,
): CompileOccurrenceLocator => {
  if (!isOccurrenceWithin(candidate, origin)) return candidate;
  return freezeOccurrence({
    sourcePath: parent.sourcePath,
    expansionPath: [
      ...parent.expansionPath,
      { kind: 'replay', index: outputIndex },
      ...candidate.expansionPath.slice(origin.expansionPath.length),
    ],
  });
};

/** 把 transaction 内的 pending handle 克隆并 remap 到最终 replay site */
export const replayPendingSpatialHandle = (
  pending: PendingSpatialHandle,
  parent: CompileOccurrenceLocator,
  outputIndex: number,
  origin: CompileOccurrenceLocator,
): PendingSpatialHandle => ({
  ...pending,
  ownerPath: pending.ownerPath.map(owner => ({
    ...owner,
    occurrence: remapSpatialOccurrenceForReplay(parent, outputIndex, origin, owner.occurrence),
  })),
  finalOccurrence: remapSpatialOccurrenceForReplay(parent, outputIndex, origin, pending.finalOccurrence),
  scopeChain: [...pending.scopeChain],
});

const projectBounds = (
  bounds: Readonly<BoundsRect>,
  chain: ReadonlyArray<Transform>,
  round: (value: number) => number,
): Readonly<BoundsRect> => {
  const corners: Array<IRPosition> = [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
  const points = corners.map(point => applyTransformChain(point, chain).map(round) as IRPosition);
  const projected = boundsOf(points);
  if (projected === undefined) throw new Error('internal: spatial handle rect projection produced no points');
  const rect = boundsToRect(projected);
  return canonicalizeBoundsRect({
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
  });
};

/** 把最终 traversal sidecar 物化为冻结、JSON-safe 的 world-space index */
export const materializeSpatialHandleIndex = (
  pending: ReadonlyArray<PendingSpatialHandle>,
  round: (value: number) => number,
): SpatialHandleIndex => {
  const entries = pending.map((record): QualifiedSpatialHandle => {
    const declaration = record.declaration;
    return Object.freeze({
      ownerPath: Object.freeze(
        record.ownerPath.map(owner =>
          Object.freeze({
            namespace: owner.namespace,
            type: owner.type,
            ...(owner.instanceId === undefined ? {} : { instanceId: owner.instanceId }),
            occurrence: freezeOccurrence(owner.occurrence),
          }),
        ),
      ),
      key: declaration.key,
      role: declaration.role,
      geometry: Object.freeze({
        kind: 'rect' as const,
        bounds: projectBounds(declaration.bounds, record.scopeChain, round),
      }),
      tags: Object.freeze([...(declaration.tags ?? [])]),
      ...(declaration.payload === undefined ? {} : { payload: declaration.payload }),
      finalOccurrence: freezeOccurrence(record.finalOccurrence),
      originOccurrence: freezeOccurrence(record.originOccurrence),
    });
  });
  return Object.freeze({ entries: Object.freeze(entries) });
};
