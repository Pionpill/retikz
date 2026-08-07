import type { CompileObservationOwner, CompileOccurrenceLocator } from '../contract';
import type { ValueOf } from '../shared';
import type { CompileWarningCode } from './constants';

/** 编译期 warning code：包含内置 code，并允许扩展能力提供自定义字符串 code */
export type CompileWarningCodeValue = ValueOf<typeof CompileWarningCode> | (string & {});

/** 编译 warning 的领域中立结构化来源 */
export type CompileWarningOrigin =
  | Readonly<{ kind: 'primary' }>
  | Readonly<{
      kind: 'observation';
      owner: CompileObservationOwner;
      occurrence: CompileOccurrenceLocator;
      stage: 'owner' | 'fragment';
    }>;

/** 编译内部创建 warning 时使用的未完成输入 */
export type CompileWarningInput = {
  /** 机器可读 warning code */
  code: CompileWarningCodeValue;
  /** 人类可读消息（英文） */
  message: string;
  /** IR locator 路径（jq-like），如 `children[3].path.children[1].to` */
  path: string;
  /** 已知时携带的结构化来源，缺省由最终排序补为 primary */
  origin?: CompileWarningOrigin;
};

/** 编译期 warning：不影响 Scene 产物，交给调用方收集或展示 */
export type CompileWarning = Omit<CompileWarningInput, 'origin'> & {
  /** warning 所属主 Scene 或 observation 阶段 */
  origin: CompileWarningOrigin;
};

/** 把结构化编译 warning 格式化为统一的可读消息 */
export const formatCompileWarning = (warning: CompileWarning): string =>
  `[retikz] ${warning.code} at ${warning.path}: ${warning.message}`;
