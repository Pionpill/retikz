import type { InputCoordinate, InputNode, InputPath, PathOptions, InputScope } from './element';
import type { InputScene } from './scene';

export type { PathOptions } from './element';

/** 创建节点时传给 node 的选项 */
export type NodeOptions = Omit<InputNode, 'type'>;

/** 创建命名坐标时传给 coordinate 的选项 */
export type CoordinateOptions = Omit<InputCoordinate, 'type'>;

/** 创建作用域时传给 scope 的选项；子图元单独传入 */
export type ScopeOptions = Omit<InputScope, 'type' | 'children'>;

/** 创建场景时传给 scene 的对象选项 */
export type SceneOptions = Omit<InputScene, 'type' | 'version'>;

/**
 * 创建作者侧节点输入，身份由配置中的 id 声明
 * @param options 节点配置，包含位置及可选的 id、文字和样式
 * @returns 带 node 类别的作者输入
 */
export const node = (options: NodeOptions): InputNode => ({ type: 'node', ...options });

/**
 * 创建作者侧命名坐标输入
 * @param options 坐标标识与位置配置
 * @returns 带 coordinate 类别的作者输入
 */
export const coordinate = (options: CoordinateOptions): InputCoordinate => ({
  type: 'coordinate',
  ...options,
});

/**
 * 创建作者侧路径输入，身份由配置中的 id 声明
 * @param options 路径配置，way 与 children 互斥
 * @returns 保留配置字段的路径作者输入
 */
export const path = (options: PathOptions): InputPath => ({
  type: 'path',
  ...options,
});

/**
 * 创建一组图元的作者侧作用域输入
 * @param options 局部变换、样式、裁剪与引用配置
 * @param children 按声明顺序保留的子图元，不复制子数组
 * @returns 保留配置与子图元引用的 Scope 输入，尚未归一化或编译
 */
export const scope = (options: ScopeOptions, children: InputScene['children']): InputScope => ({
  type: 'scope',
  ...options,
  children,
});

/** 构造单图作者输入，不编译或复制子图元 */
export const scene = (input: InputScene['children'] | SceneOptions): InputScene =>
  'children' in input ? { type: 'scene', ...input } : { type: 'scene', children: input };
