import type { CompileOptions, Scene } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { AffineMatrix } from '@retikz/math';

import type { InspectionTarget, InspectorKey } from '../contract';
import type { InspectorRegistry } from '../providers';

/** 对当前编译结果的检查请求；省略目标表示所有匹配对象 */
export type InspectionRequest = Readonly<{
  /** 已注册检查器的键 */
  inspector: InspectorKey;
  /** 当前快照内的目标；省略时选择全部匹配对象 */
  target?: InspectionTarget;
  /** 交给检查器选项 schema 的输入；省略等价于空对象 */
  options?: JsonObject;
}>;

/** 辅助编译配置，不参与主图编译 */
export type InspectionCompileOptions = Readonly<{
  /** 本次可用的检查器定义，注册不等于启用 */
  registry: InspectorRegistry;
  /** 按顺序执行的请求；空数组不产生辅助图 */
  requests: ReadonlyArray<InspectionRequest>;
  /** 辅助 IR 使用的普通编译配置；省略遵循 Core 默认值 */
  compileOptions?: Omit<CompileOptions, 'onWarn'>;
}>;

/** 诊断定位到检查请求，不冒充作者输入路径 */
export type InspectionDiagnosticOrigin = Readonly<{
  /** 产生诊断的消费阶段 */
  stage: 'selection' | 'inspect' | 'fragment';
  /** 当前请求的零基索引 */
  requestIndex: number;
  /** 产生诊断的检查器键 */
  inspector: InspectorKey;
  /** 已确定的当前快照目标 */
  target?: InspectionTarget;
  /** 回调输出片段的零基索引 */
  outputIndex?: number;
}>;

/** 检查独立诊断，保留底层警告内容 */
export type InspectionDiagnostic = Readonly<{
  /** 检查请求及片段定位 */
  origin: InspectionDiagnosticOrigin;
  /** 原始警告的代码、消息与可选路径 */
  cause: Readonly<{ code: string; message: string; path?: string }>;
}>;

/** 已独立编译、可交给普通只读图层的结果 */
export type InspectionPlaneEntry = Readonly<{
  /** 生成该条目的检查器键 */
  inspector: InspectorKey;
  /** 被检查对象在当前输入快照中的位置 */
  target: InspectionTarget;
  /** 已清除公共身份、meta 与动画的独立辅助场景 */
  scene: Scene;
  /** 将辅助场景放置到主 Scene 坐标系的矩阵 */
  transform: AffineMatrix;
}>;

/** 当前快照的完整辅助平面 */
export type InspectionPlane = Readonly<{ entries: ReadonlyArray<InspectionPlaneEntry> }>;

/** 只交付辅助产物，不复制主图结果 */
export type InspectionCompileResult = Readonly<{
  /** 完整辅助平面；没有可绘制内容时为 null */
  inspection: InspectionPlane | null;
  /** 本次检查与辅助编译的独立警告 */
  diagnostics: ReadonlyArray<InspectionDiagnostic>;
}>;
