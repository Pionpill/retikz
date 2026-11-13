import type { PropertyPath } from '@retikz/foundation';

import type {
  AnyPathDefinition,
  ArrowDefinition,
  MarkDefinition,
  PatternDefinition,
  TextMeasurer,
  SceneResources,
  ScenePrimitive,
  Transform,
} from '../../contract';
import type { CanonicalNodeBoundary, MergedScopeDefaults, PathResolution } from '../../resolve';
import type { IRPathBase, IRPosition, IRTarget, CanonicalDropShadow } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { BoundaryStore, CompiledBoundaryGeometry } from '../boundary';
import type { RegisterPaint } from '../resource';
import type { ComposedScopeTransform, CompileWarning } from '../shared';
import type { TexLowerer } from '../text';
import type { PreparedStrokePathCompilation } from './stroke';

/** 路径绘制的可选服务；调用方可省略资源、诊断、变换和公式能力 */
export type PathEmitOptions = Partial<
  Pick<PathCompileContext, 'resources' | 'onWarn' | 'scopeChain' | 'registerPaint' | 'lowerTex'> &
    Pick<PathTargetContext, 'targetView'>
>;

/** 已快照化、可反复读取的 Path 图元与边界贡献 */
export type PathEmitOutput = {
  /** 已校验并快照化的图元 */
  primitives: Array<ScenePrimitive>;
  /** 当前路径局部坐标中的布局边界点 */
  boundsPoints: Array<IRPosition>;
};

/** Path 宿主阶段产物，自定义路径不要求具有单一中心线 */
export type CompiledPath = Pick<PreparedPathCompilation, 'targets'> &
  Readonly<{
    /** 完整 Definition 输出；null 表示合法空结果 */
    emit: PathEmitOutput | null;
    /** 本次 Definition 实际使用的当前源路径标准描边产物 */
    stroke?: PreparedStrokePathCompilation;
    /** 当前输入声明的阴影，供布局贡献消费 */
    style: { shadow?: CanonicalDropShadow };
  }>;

/** 调用方确认有效的 Path 原子阶段产物，Core 不判断跨次有效性 */
export type PreparedPathCompilation = {
  /** 与当前步骤及字段路径对应的目标绑定，空 Map 也是有效结果 */
  targets?: BoundPathResolution['targets'];
  /** 完整 Definition 输出，undefined 为未计算，null 为合法空结果；调用方恢复配套资源 */
  emit?: PathEmitOutput | null;
  /** 当前源路径标准描边能力的局部或完整产物 */
  stroke?: PreparedStrokePathCompilation;
};

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

/** 路径目标查询所需的能力绑定和当前坐标系 */
export type PathTargetContext = Pick<InputPathCompilation, 'scopeChain'> & {
  /** 当前编译绑定的目标查询能力 */
  targetView: PathTargetView;
};

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
  /** 直接引用的节点或作用域边界查询上下文，坐标目标不设置 */
  geometry?: CompiledBoundaryGeometry;
  /** 目标引用的声明来源 */
  irPath?: PropertyPath;
  /** 节点目标选用的连接面，普通坐标目标不设置 */
  canonicalBoundary?: CanonicalNodeBoundary;
}>;

/** 完成声明解析和目标几何绑定的路径 */
export type BoundPathResolution = PathResolution & {
  /** 按目标来源路径索引的绑定 */
  targets: ReadonlyMap<string, TargetResolution>;
};

/** 路径编译使用的当前环境、目标查询与宿主能力 */
export type PathCompileContext = Omit<InputPathCompilation, 'path'> &
  Readonly<{
    /** 当前路径目标查询能力 */
    targetResolver: PathTargetResolver;
    /** 路径与装饰解析所需的定义 */
    registries: Readonly<{
      /** 路径主体定义 */
      pathRegistry: ReadonlyMap<string, AnyPathDefinition>;
      /** 箭头定义 */
      arrowRegistry: ReadonlyMap<string, ArrowDefinition>;
      /** 路径标记定义 */
      markRegistry: ReadonlyMap<string, MarkDefinition>;
      /** 图案定义 */
      patternRegistry: ReadonlyMap<string, PatternDefinition>;
    }>;
    /** 数值圆整 */
    round: (value: number) => number;
    /** 根字号 */
    rootFontSize: number;
    /** 文字测量 */
    measureText: TextMeasurer;
    /** 公式降级服务 */
    lowerTex?: TexLowerer;
    /** 几何缓存 */
    boundaryStore: BoundaryStore;
    /** 资源登记 */
    registerPaint: RegisterPaint;
    /** 当前可读取的绘制与裁剪资源 */
    resources: () => SceneResources;
    /** 收集诊断，不向用户发布 */
    onWarn: (warning: CompileWarning) => void;
    /** 按坐标链提供合成变换 */
    resolveTransform: (chain: ReadonlyArray<Transform>) => ComposedScopeTransform;
  }>;
