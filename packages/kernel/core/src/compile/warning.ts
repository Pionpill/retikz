import type { ValueOf } from '../shared';
import type { CompileWarningCode } from './constants';

export type CompileWarningCodeValue = ValueOf<typeof CompileWarningCode> | (string & {});

/** 编译期 warning：不影响 Scene 产物，交给调用方收集或展示。 */
export type CompileWarning = {
  /** 机器可读 warning code。 */
  code: CompileWarningCodeValue;
  /** 人类可读消息（英文）。 */
  message: string;
  /** IR locator 路径（jq-like），如 `children[3].path.children[1].to`。 */
  path: string;
};

export const formatCompileWarning = (warning: CompileWarning): string =>
  `[retikz] ${warning.code} at ${warning.path}: ${warning.message}`;
