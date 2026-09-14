import type { CompileObservationOwner } from './types';

/** 判断两个编译 observation 所属者是否相同 */
export const isCompileObservationOwnerEqual = (
  left: CompileObservationOwner,
  right: CompileObservationOwner,
): boolean => {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case 'path':
      return right.kind === 'path' && left.name === right.name;
    case 'composite':
      return right.kind === 'composite' && left.namespace === right.namespace && left.type === right.type;
    case 'node':
    case 'scope':
    case 'coordinate':
    case 'clip':
      return true;
  }
};
