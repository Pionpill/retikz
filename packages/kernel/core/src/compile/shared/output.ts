import type { ScenePrimitive, SceneResource } from '../../contract';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';

/** 元素本地可见边界的一项贡献，独立保留阴影语义 */
export type CompileBounds = Readonly<{
  /** 本地边界点 */
  boundsPoints: ReadonlyArray<IRPosition>;
  /** 本项阴影 */
  shadow?: CanonicalDropShadow;
  /** 外框等装饰边界，祖先 clip 可裁减其可见范围 */
  decoration?: boolean;
}>;

/** 与本地资源配套的输出片段，不包含重复的子树 */
export type CompileOutput = Readonly<{
  /** 本元素绘制贡献 */
  primitives: Array<ScenePrimitive>;
  /** 同层输出排序值 */
  zIndex?: number;
  /** 图元引用的局部资源 */
  resources: Array<SceneResource>;
  /** 可见边界贡献 */
  bounds: ReadonlyArray<CompileBounds>;
}>;
