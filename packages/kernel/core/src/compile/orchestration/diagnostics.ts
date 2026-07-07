import type { IRTransform } from '../../schemas';
import type { DuplicateRegisterInfo } from '../namespace';
import type { CompileWarning } from '../warning';

import { CompileWarningCode } from '../constants';

/** 按 transform 失败来源选择 warning code。 */
export const transformWarnCode = (failed: IRTransform | undefined): CompileWarning['code'] => {
  switch (failed?.kind) {
    case 'offset-translate':
      return CompileWarningCode.OffsetBaseUnresolved;
    case 'at-translate':
      return CompileWarningCode.AtTargetUnresolved;
    case 'polar-translate':
      return CompileWarningCode.PolarOriginUnresolved;
    default:
      return CompileWarningCode.UnresolvedNodeReference;
  }
};

/** 格式化重复 id warning。 */
export const createDuplicateWarning = (info: DuplicateRegisterInfo): CompileWarning => {
  const frameNote =
    info.frameDepth === 0
      ? 'frame depth: 0 (root namespace)'
      : `frame depth: ${info.frameDepth} (under <Scope localNamespace>)`;
  const firstLoc = info.firstIrPath ?? '(unknown earlier location)';
  const secondLoc = info.secondIrPath ?? '(unknown current location)';
  return {
    code: CompileWarningCode.DuplicateNodeId,
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); first defined at ${firstLoc}, redefined at ${secondLoc}. The later definition overrides the earlier one (last-wins).`,
    path: secondLoc,
  };
};
