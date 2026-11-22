import type { InputCoordinate, InputNode, InputPath, InputPathConfig, InputScope } from './element';
import type { InputChild, InputLayer, InputScene, InputSceneChildren, InputSceneLayers } from './scene';

/**
 * 创建作者侧节点输入，身份由配置中的 id 声明
 * @param config 节点配置，包含位置及可选的 id、文字和样式
 * @returns 带 node 类别的作者输入
 */
export const node = (config: Omit<InputNode, 'type'>): InputNode => ({ type: 'node', ...config });

/**
 * 创建作者侧命名坐标输入
 * @param config 坐标标识与位置配置
 * @returns 带 coordinate 类别的作者输入
 */
export const coordinate = (config: Omit<InputCoordinate, 'type'>): InputCoordinate => ({
  type: 'coordinate',
  ...config,
});

/**
 * 创建作者侧路径输入，身份由配置中的 id 声明
 * @param config 路径配置，way 与 children 互斥
 * @returns 保留配置字段的路径作者输入
 */
export const path = (config: InputPathConfig): InputPath => ({
  type: 'path',
  ...config,
});

/**
 * 创建一组图元的作者侧作用域输入
 * @param config 局部变换、样式、裁剪与引用配置
 * @param children 按声明顺序保留的子图元，不复制子数组
 * @returns 保留配置与子图元引用的 Scope 输入，尚未归一化或编译
 */
export const scope = (
  config: Omit<InputScope, 'type' | 'children'>,
  children: ReadonlyArray<InputChild>,
): InputScope => ({ type: 'scope', ...config, children });

/**
 * 创建作者侧分层输入
 * @param config 分层名称、排序、计算配置与子图元
 * @returns 带 layer 类别的输入，不编译或复制子图元
 */
export const layer = (config: Omit<InputLayer, 'type'>): InputLayer => ({ type: 'layer', ...config });

/**
 * 用子图元列表创建场景
 * @param children 有序子图元列表，允许空数组
 * @returns 保留子数组引用的场景输入，数据版本在归一化时补齐
 */
export function scene(children: ReadonlyArray<InputChild>): InputSceneChildren;
/**
 * 用子图元和全图配置创建场景
 * @param input children 与主题、视框等全图配置，不接受 layers
 * @returns 保留配置与子图元引用的场景输入，尚未编译
 */
export function scene(input: Omit<InputSceneChildren, 'type' | 'version'>): InputSceneChildren;
/**
 * 用显式分层创建场景
 * @param input layers 与全图配置，不接受 children
 * @returns 保留图层列表引用的场景输入；归一化时每个图层独立生成结果
 */
export function scene(input: Omit<InputSceneLayers, 'type' | 'version'>): InputSceneLayers;

/** 创建作者侧 Scene 输入 */
export function scene(
  input:
    | ReadonlyArray<InputChild>
    | Omit<InputSceneChildren, 'type' | 'version'>
    | Omit<InputSceneLayers, 'type' | 'version'>,
): InputScene {
  if ('layers' in input || 'children' in input) return { type: 'scene', ...input };
  return { type: 'scene', children: input };
}
