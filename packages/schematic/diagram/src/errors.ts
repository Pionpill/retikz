import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Diagram package 的稳定错误码 */
export const RetikzDiagramErrorCode = {
  DefinitionDuplicate: 'DIAGRAM_DEFINITION_DUPLICATE',
  DefinitionInvalid: 'DIAGRAM_DEFINITION_INVALID',
  DefinitionNotRegistered: 'DIAGRAM_DEFINITION_NOT_REGISTERED',
  DefinitionCallbackFailed: 'DIAGRAM_DEFINITION_CALLBACK_FAILED',
  ResolveInvalid: 'DIAGRAM_RESOLVE_INVALID',
} as const;

/** Diagram package 稳定错误码取值 */
export type RetikzDiagramErrorCodeValue = ValueOf<typeof RetikzDiagramErrorCode>;

/** Diagram package 错误的结构化详情 */
export type RetikzDiagramErrorDetails = Readonly<{
  capability?: string;
  key?: string;
  availableKeys?: ReadonlyArray<string>;
  reason?: string;
}>;

/** 创建 Diagram package 错误所需的参数 */
export type RetikzDiagramErrorOptions = Readonly<{
  code: RetikzDiagramErrorCodeValue;
  message: string;
  details: RetikzDiagramErrorDetails;
  cause?: unknown;
}>;

/** Diagram package 的统一结构化错误 */
export class RetikzDiagramError extends RetikzError<RetikzDiagramErrorCodeValue, RetikzDiagramErrorDetails> {
  readonly code: RetikzDiagramErrorCodeValue;
  readonly details: RetikzDiagramErrorDetails;
  override readonly cause: unknown;

  /** 创建 Diagram package 错误 */
  constructor(options: RetikzDiagramErrorOptions) {
    super(options);
    this.name = 'RetikzDiagramError';
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}
