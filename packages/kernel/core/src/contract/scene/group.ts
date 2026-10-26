import type { ClipFillRule } from '../../schemas';
import type { ScenePrimitiveBase } from './base';
import type { PathCommand } from './path';
import type { ScenePrimitive } from './scene';

/** Translate transform：沿 x / y 平移（user units） */
export type TranslateTransform = {
  /** 鉴别字面量 */
  kind: 'translate';
  /** x 方向位移 */
  x: number;
  /** y 方向位移（屏幕 y-down） */
  y: number;
};

/** Rotate transform：按角度旋转，可指定旋转中心；中心缺省 = 绕原点 (0, 0) */
export type RotateTransform = {
  /** 鉴别字面量 */
  kind: 'rotate';
  /** 旋转角度（度，正向 = 屏幕 y-down 下的视觉顺时针） */
  degrees: number;
  /**
   * 旋转中心 x（缺省 0）
   * @default 0
   */
  cx?: number;
  /**
   * 旋转中心 y（缺省 0）
   * @default 0
   */
  cy?: number;
};

/** Scale transform：等比 / 非等比缩放；y 缺省 = x（等比） */
export type ScaleTransform = {
  /** 鉴别字面量 */
  kind: 'scale';
  /** x 轴缩放因子 */
  x: number;
  /**
   * y 轴缩放因子；缺省 = x（等比缩放）
   * @default x
   */
  y?: number;
};

/**
 * Group transform：结构化变换（3 分支 discriminated union）
 * @description 按数组顺序应用（与 SVG transform 多操作列表语义一致）；角度=度，缩放 y 缺省等比 x，rotate cx/cy 缺省绕原点。每个 kind 有对应 named type export
 */
export type Transform = TranslateTransform | RotateTransform | ScaleTransform;

/** renderer、bounds 与 hit-test 共同消费的规范裁剪路径 */
export type SceneClipPath = {
  /** 按 authored 子路径顺序保存的结构化命令 */
  commands: Array<PathCommand>;
  /** 整条裁剪路径使用的显式填充规则 */
  fillRule: ClipFillRule;
};

/** 由 GroupPrimitive 引用的具名 Scene 裁剪资源 */
export type ClipResource = {
  /** 标识场景裁剪资源 */
  kind: 'clip';
  /** 供场景图元引用的资源标识 */
  id: string;
  /** 后端无关的完整裁剪路径 */
  path: SceneClipPath;
};

/** 分组图元的子图元、变换与裁剪引用 */
export type GroupPrimitiveContent = {
  /**
   * 结构化变换序列，按数组顺序应用；undefined / 空数组表示无变换
   * @default []
   */
  transforms?: Array<Transform>;
  /**
   * 裁剪资源 id：指向 `Scene.resources` 里某 ClipResource
   * @description 有值时该 group 的所有子原语被裁到该资源描述的区域（adapter → `<g clip-path="url(#id)">`）；
   *   裁剪区坐标在该 group 的局部坐标系（与 children 同帧）。缺省 = 不裁
   * @default undefined
   */
  clipRef?: string;
  /** 组内子原语 */
  children: Array<ScenePrimitive>;
};

/** 编组：把若干 primitive 用结构化 transforms 包起来 */
export type GroupPrimitive = ScenePrimitiveBase &
  GroupPrimitiveContent & {
    /** 类型判别符 */
    type: 'group';
  };
