import type { PropertyPath } from '@retikz/foundation';

import type { ScenePrimitive, SceneResource, Transform } from '../../contract';
import type { BoundaryResolution, MergedScopeDefaults, PathResolution } from '../../resolve';
import type { IRPathBase, IRPosition, IRTarget } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { CompiledNodeLayout } from '../node';
import type { RegisterPaint } from '../resource';
import type { CompileWarning } from '../shared';
import type { TexLowerer } from '../text';

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
  /** compile 阶段绑定的 target geometry view（由 emit context 提供） */
  targetView?: PathTargetView;
  /** 注入的 TeX 降级能力 */
  lowerTex?: TexLowerer;
  /** preset 与 rem 字号解析的根字号 */
  rootFontSize?: number;
};

/** Path 宿主阶段产物，自定义路径不要求具有单一中心线 */
export type CompiledPath = Readonly<{
  /** 当前路径已绑定的语义与目标 */
  resolution: BoundPathResolution;
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

/** 路径解析所需的目标坐标与节点绑定查询能力 */
export type PathTargetResolver = Readonly<{
  /** 查询目标在当前作用域中的局部坐标，无法定位时返回 null */
  pointOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 查询目标的世界参考点；未提供或返回空值时，解析器沿用局部坐标 */
  refPointOfTarget?: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 查询目标坐标及所引用的节点与连接面，返回空值时改用坐标查询 */
  bindTarget?: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => TargetResolution | null;
}>;

/** 基于已绑定目标提供的坐标查询与边界裁剪能力 */
export type PathTargetView = Readonly<{
  /** 读取目标的局部坐标，无法定位时返回 null */
  pointOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 读取绑定中保存的参考点，未绑定时尝试使用局部坐标 */
  referenceOfTarget: (target: IRTarget, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 沿局部坐标 toward 的方向求节点连接面上的点，返回局部坐标 */
  clipTarget: (target: IRTarget, toward: IRPosition, scopeChain: ReadonlyArray<Transform>) => IRPosition | null;
  /** 移除以自动节点目标为起点的折线内部前缀；空数组表示没有外部可见部分 */
  clipPolylineTarget: (
    target: IRTarget,
    points: ReadonlyArray<IRPosition>,
    scopeChain: ReadonlyArray<Transform>,
  ) => Array<IRPosition>;
}>;

/** 单个路径目标的坐标与节点绑定结果 */
export type TargetResolution = Readonly<{
  /** 参与绑定的目标，可能已由相对偏移转换为坐标 */
  target: IRTarget;
  /** 当前作用域中的局部坐标，无法定位时为 null */
  point: IRPosition | null;
  /** 绑定器提供的世界参考点；未提供时可能沿用局部坐标，无法定位时为 null */
  referencePoint: IRPosition | null;
  /** 直接引用的节点、坐标或作用域几何，普通坐标目标不设置 */
  node?: CompiledNodeLayout;
  /** 目标引用的声明来源 */
  irPath?: PropertyPath;
  /** 节点目标选用的连接面，普通坐标目标不设置 */
  boundaryResolution?: BoundaryResolution;
}>;

/** 路径目标绑定使用的坐标查询能力 */
export type PathTargetContext = {
  /** 当前作用域变换 */
  scopeChain?: ReadonlyArray<Transform>;
  /** 目标查询服务 */
  targetResolver?: PathTargetResolver;
};

/** 完成声明解析和目标几何绑定的路径 */
export type BoundPathResolution = PathResolution & {
  /** 按目标来源路径索引的绑定 */
  targets: ReadonlyMap<string, TargetResolution>;
};
