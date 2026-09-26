import type { InputCoordinate } from './coordinate';
import type { InputEmbed } from './embed';
import type { InputNode } from './node';
import type { InputPath } from './path';
import type { InputChild, InputLayer, InputScene, InputSceneChildren, InputSceneLayers } from './scene';
import type { InputScope } from './scope';

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
export const path = (config: Omit<InputPath, 'type'>): InputPath => ({ ...config });

/**
 * 创建一组图元的作者侧作用域输入
 * @param config 局部变换、样式、裁剪与引用配置
 * @param children 按声明顺序保留的子图元，不复制子数组
 * @returns 保留配置与子图元引用的 Scope 输入，尚未归一化或编译
 */
export const scope = (
  config: Omit<InputScope, 'type' | 'children'>,
  children: ReadonlyArray<InputScope['children'][number]>,
): InputScope => ({ ...config, children });

/**
 * 创建作者侧分层输入
 * @param config 分层标识、排序、缓存提示与子图元
 * @returns 带 layer 类别的输入，不编译或复制子图元
 */
export const layer = (config: Omit<InputLayer, 'type'>): InputLayer => ({ type: 'layer', ...config });

/** 创建作者侧 Tier 2 嵌入输入 */
export const embed = <TProps = Record<string, unknown>>(
  config: Omit<InputEmbed<TProps>, 'type'>,
): InputEmbed<TProps> => ({
  type: 'embed',
  ...config,
});

/** 创建作者侧 children Scene 的完整配置 */
type InputSceneChildrenOptions = Omit<InputSceneChildren, 'type' | 'version'>;

/** 创建作者侧 Layer Scene 的完整配置 */
type InputSceneLayersOptions = Omit<InputSceneLayers, 'type' | 'version'>;

/** 创建作者侧 Scene 输入 */
type CreateInputScene = {
  /**
   * 用子图元列表创建场景
   * @param children 有序子图元列表，允许空数组
   * @returns 保留子数组引用的场景输入，数据版本在归一化时补齐
   */
  (children: ReadonlyArray<InputChild>): InputSceneChildren;
  /**
   * 用子图元和全图配置创建场景
   * @param input children 与主题、视框等全图配置，不接受 layers
   * @returns 保留配置与子图元引用的场景输入，尚未编译
   */
  (input: InputSceneChildrenOptions): InputSceneChildren;
  /**
   * 用显式分层创建场景
   * @param input layers 与全图配置，不接受 children
   * @returns 保留分层列表引用的场景输入，分层运行时信息由归一化提取
   */
  (input: InputSceneLayersOptions): InputSceneLayers;
};

/** 创建作者侧 Scene 输入 */
const createInputScene = (
  input: ReadonlyArray<InputChild> | InputSceneChildrenOptions | InputSceneLayersOptions,
): InputScene => {
  if (Array.isArray(input)) return { type: 'scene', children: input };
  if ('layers' in input && input.layers !== undefined) {
    const { children: _children, ...config } = input;
    void _children;
    return { type: 'scene', ...config, layers: input.layers };
  }
  const childrenInput = input as InputSceneChildrenOptions;
  const { layers: _layers, ...config } = childrenInput;
  void _layers;
  return { type: 'scene', ...config, children: childrenInput.children };
};

/** 创建作者侧 Scene 输入 */
export const scene = createInputScene as CreateInputScene;
