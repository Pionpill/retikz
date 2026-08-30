import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Diagram Foundation 的稳定错误码 */
export const RetikzDiagramErrorCode = {
  /** Diagram Theme Definition key 重复 */
  DefinitionDuplicate: 'DIAGRAM_DEFINITION_DUPLICATE',
  /** Diagram Theme Definition 未注册 */
  DefinitionNotRegistered: 'DIAGRAM_DEFINITION_NOT_REGISTERED',
  /** Diagram Theme Definition 回调或回调结果无效 */
  DefinitionCallbackFailed: 'DIAGRAM_DEFINITION_CALLBACK_FAILED',
  /** Diagram Frame 与当前 presentation 不一致 */
  FrameInvalid: 'DIAGRAM_FRAME_INVALID',
} as const;

/** Diagram Foundation 稳定错误码取值 */
export type RetikzDiagramErrorCodeValue = ValueOf<typeof RetikzDiagramErrorCode>;

/** Diagram Foundation 错误的结构化详情 */
export type RetikzDiagramErrorDetails = Readonly<{
  /** 发生错误的公开或内部 style 名称 */
  name?: string;
  /** 违反的不变量或输入约束 */
  reason?: string;
}>;

/** Diagram Foundation 的统一结构化错误 */
export class RetikzDiagramError extends RetikzError<RetikzDiagramErrorCodeValue, RetikzDiagramErrorDetails> {
  /** 创建 Diagram Foundation 错误 */
  constructor(
    code: RetikzDiagramErrorCodeValue,
    message: string,
    details: RetikzDiagramErrorDetails = {},
    cause?: unknown,
  ) {
    super({ code, message, details, cause });
  }
}
