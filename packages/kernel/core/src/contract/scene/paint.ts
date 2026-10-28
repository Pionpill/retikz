import type { IRPaint } from '../../schemas';
import type { ScenePrimitive } from './scene';

/**
 * paint 属性取值词汇表（可用于 fill / stroke，不绑定单一属性）
 * @description 渲染无关：`string` 表示纯色，`resourceRef` 指向 `Scene.resources`，`contextStroke` 继承所在元素描边
 */
export type PaintValue =
  | string
  | {
      /** 资源引用或继承宿主描边的绘制值判别 */
      kind: 'resourceRef';
      /** 当前绘制值引用的场景资源标识 */
      id: string;
    }
  | {
      /** 资源引用或继承宿主描边的绘制值判别 */
      kind: 'contextStroke';
    };

/**
 * 已解析 pattern tile
 * @description 描述 tile 周期、可选底色 / 旋转和局部 motif 几何；纯 JSON 数据
 */
export type CompiledPatternTile = {
  /** tile 周期（user units）；= 解析后 pattern.size（缺省 8） */
  size: number;
  /**
   * tile 背景填充（CSS 串）；缺省透明（字段缺省）
   * @default undefined
   */
  background?: string;
  /**
   * 整体旋转角（度）；= pattern.rotation，缺省不旋转（字段缺省）
   * @default 0
   */
  rotation?: number;
  /** 局部 tile 坐标系下的基础场景图元，使用所属 Scene 的资源 */
  motif: Array<ScenePrimitive>;
};

/** 绘制资源的分类与标识 */
type PaintResourceBase = {
  /** 标识场景绘制资源 */
  kind: 'paint';
  /** 供填充或描边引用的资源标识 */
  id: string;
};

/** 线性、径向或锥形渐变资源 */
export type GradientResource = PaintResourceBase & {
  /** 渐变绘制声明 */
  spec: Extract<IRPaint, { kind: 'linearGradient' | 'radialGradient' | 'conicGradient' }>;
};

/** 已编译局部图元的图案资源 */
export type PatternResource = PaintResourceBase & {
  /** 图案绘制声明 */
  spec: Extract<IRPaint, { kind: 'pattern' }>;
  /** 已解析的图案周期与局部图元 */
  tile: CompiledPatternTile;
};

/** 图像绘制资源 */
export type ImageResource = PaintResourceBase & {
  /** 图像来源与适配方式 */
  spec: Extract<IRPaint, { kind: 'image' }>;
};

/** 供图元填充或描边引用的渐变、图案或图像资源 */
export type PaintResource = GradientResource | PatternResource | ImageResource;
