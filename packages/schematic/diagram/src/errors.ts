import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Diagram package 的稳定错误码 */
export const RetikzDiagramErrorCode = {
  DefinitionDuplicate: 'DIAGRAM_DEFINITION_DUPLICATE',
  DefinitionInvalid: 'DIAGRAM_DEFINITION_INVALID',
  DefinitionNotRegistered: 'DIAGRAM_DEFINITION_NOT_REGISTERED',
  DefinitionCallbackFailed: 'DIAGRAM_DEFINITION_CALLBACK_FAILED',
  ResolveInvalid: 'DIAGRAM_RESOLVE_INVALID',
  BranchReferenceInvalid: 'DIAGRAM_BRANCH_REFERENCE_INVALID',
  BranchTopologyInvalid: 'DIAGRAM_BRANCH_TOPOLOGY_INVALID',
  BranchSharedStyleConflict: 'DIAGRAM_BRANCH_SHARED_STYLE_CONFLICT',
  BranchMeasurementFailed: 'DIAGRAM_BRANCH_MEASUREMENT_FAILED',
  BranchLayoutOutputInvalid: 'DIAGRAM_BRANCH_LAYOUT_OUTPUT_INVALID',
  BranchMaterializationFailed: 'DIAGRAM_BRANCH_MATERIALIZATION_FAILED',
  FlowDuplicateId: 'DIAGRAM_FLOW_DUPLICATE_ID',
  FlowReferenceNotFound: 'DIAGRAM_FLOW_REFERENCE_NOT_FOUND',
  FlowContainmentInvalid: 'DIAGRAM_FLOW_CONTAINMENT_INVALID',
  FlowEndpointInvalid: 'DIAGRAM_FLOW_ENDPOINT_INVALID',
  FlowConstraintUnsatisfiable: 'DIAGRAM_FLOW_CONSTRAINT_UNSATISFIABLE',
  FlowLayoutCapabilityUnsupported: 'DIAGRAM_FLOW_LAYOUT_CAPABILITY_UNSUPPORTED',
  FlowLayoutOutputInvalid: 'DIAGRAM_FLOW_LAYOUT_OUTPUT_INVALID',
  FlowMeasurementFailed: 'DIAGRAM_FLOW_MEASUREMENT_FAILED',
  FlowBezierRouteUnavailable: 'DIAGRAM_FLOW_BEZIER_ROUTE_UNAVAILABLE',
  FlowMaterializationFailed: 'DIAGRAM_FLOW_MATERIALIZATION_FAILED',
} as const;

/** Diagram package 稳定错误码取值 */
export type RetikzDiagramErrorCode = ValueOf<typeof RetikzDiagramErrorCode>;

/** Diagram package 错误的结构化详情 */
export type RetikzDiagramErrorDetails = Readonly<{
  /** 发生失败的能力域 */
  capability?: string;
  /** 无法注册或查找的定义键 */
  key?: string;
  /** 查找失败时当前可用的定义键 */
  availableKeys?: ReadonlyArray<string>;
  /** 具体失败原因，便于定位可修正的输入 */
  reason?: string;
  /** 错误字段在作者输入中的路径 */
  path?: ReadonlyArray<string | number>;
  /** 错误字段在 provider 输出中的路径 */
  outputPath?: ReadonlyArray<string | number>;
  /** 与失败有关的元素身份 */
  relatedIds?: ReadonlyArray<string>;
  /** 失败涉及的定义名称 */
  definition?: string;
  /** 当前定义未提供的必需能力 */
  missingCapabilities?: ReadonlyArray<string>;
  /** 发生错误的解析、布局、测量、物化或装配阶段 */
  stage?: 'resolve' | 'layout' | 'measure' | 'materialize' | 'assemble';
  /** 发生失败的 provider 标识 */
  providerKey?: string;
}>;

/** 创建 Diagram package 错误所需的参数 */
export type RetikzDiagramErrorOptions = Readonly<{
  /** 调用者可据以分类处理的稳定错误码 */
  code: RetikzDiagramErrorCode;
  /** 描述本次失败的可读消息 */
  message: string;
  /** 与具体失败有关的结构化定位信息 */
  details: RetikzDiagramErrorDetails;
  /** 来自外部回调或底层操作的原始失败值 */
  cause?: unknown;
}>;

/** Diagram package 的统一结构化错误 */
export class RetikzDiagramError extends RetikzError<RetikzDiagramErrorCode, RetikzDiagramErrorDetails> {
  /** 调用者可据以分类处理的稳定错误码 */
  readonly code: RetikzDiagramErrorCode;
  /** 与具体失败有关的结构化定位信息 */
  readonly details: RetikzDiagramErrorDetails;
  /** 保留的底层或外部回调原始失败值 */
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
