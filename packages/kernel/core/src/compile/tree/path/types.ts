import type { PropertyPath } from '@retikz/foundation';

import type { ScenePrimitive, SceneResource, Transform } from '../../../contract';
import type { MergedScopeDefaults, PathResolution, PathTargetView } from '../../../resolve';
import type { IRPathBase, IRPosition } from '../../../schemas';
import type { CanonicalTheme } from '../../../shared';
import type { RegisterPaint } from '../../resource';
import type { CompileWarning } from '../../shared';
import type { TexLowerer } from '../../text';

/** path emit 阶段的可选服务与诊断上下文 */
export type PathEmitOptions = {
  /** 当前编译资源，用于标记可视边界计算 */
  resources?: () => ReadonlyArray<SceneResource>;
  /**
   * 警告收集器（由 compileToScene 传入）
   * 缺省时不发出警告
   */
  onWarn?: (warning: CompileWarning) => void;
  /** 该 path 所属 scope 的累积 transform 链 */
  scopeChain?: ReadonlyArray<Transform>;
  /**
   * paint 登记函数（已解析绘制值 → resourceRef）；缺省时纯色透传、IRPaint 退化为无填充 / currentColor
   * @default undefined
   */
  registerPaint?: RegisterPaint;
  /** resolving 阶段绑定的 target geometry view（由 emit context 提供） */
  targetView?: PathTargetView;
  /** 注入的 TeX 降级能力 */
  lowerTex?: TexLowerer;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
};

/** Path 宿主阶段产物，自定义路径不要求具有单一中心线 */
export type CompiledPath = Readonly<{
  /** 当前路径已绑定的语义与目标 */
  resolution: PathResolution;
  /** 已校验且物化的输出，null 表示合法空结果 */
  result: {
    /** 路径局部绘制图元 */
    primitives: Array<ScenePrimitive>;
    /** 路径局部布局贡献 */
    boundsPoints: Array<IRPosition>;
  } | null;
}>;

/** 引用就绪后的路径编译输入，不包含遍历队列或输出容器 */
export type InputPathCompilation = {
  /** 当前路径声明 */
  path: IRPathBase;
  /** 当前变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** 诊断位置 */
  irPath: PropertyPath;
  /** 有效样式默认值 */
  scopeDefaults: MergedScopeDefaults;
  /** 当前主题 */
  theme: CanonicalTheme;
};
