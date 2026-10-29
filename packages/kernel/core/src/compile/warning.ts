import type { PropertyPath, WithRequiredProperties } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileWarningCode } from './constants';

/** 编译 warning 的领域中立结构化来源 */
export type CompileWarningOrigin = Readonly<{
  /** 主编译诊断 */
  kind: 'primary';
}>;

/** 编译内部创建 warning 时使用的未完成输入 */
export type InputCompileWarning = {
  /** 机器可读 warning code */
  code: CompileWarningCode;
  /** 人类可读消息（英文） */
  message: string;
  /** 相对输入根对象的完整属性路径 */
  path: PropertyPath;
  /** 已知时携带的结构化来源，缺省由最终排序补为 primary */
  origin?: CompileWarningOrigin;
};

/** 编译期 warning：不影响 Scene 产物，交给调用方收集或展示 */
export type CompileWarning = WithRequiredProperties<InputCompileWarning, 'origin'>;

/** 把结构化编译 warning 格式化为统一的可读消息 */
export const formatCompileWarning = (warning: CompileWarning): string =>
  `[retikz] ${warning.code} at ${formatPropertyPath(warning.path)}: ${warning.message}`;
