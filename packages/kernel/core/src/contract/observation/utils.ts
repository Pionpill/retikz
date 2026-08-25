import type { CompileObservationOwner } from './types';

/** 判断两个编译 observation 所属者是否相同 */
export const isCompileObservationOwnerEqual = (
  left: CompileObservationOwner,
  right: CompileObservationOwner,
): boolean =>
  left.kind === right.kind &&
  (left.kind === 'pathKind'
    ? right.kind === 'pathKind' && left.name === right.name
    : right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type);
