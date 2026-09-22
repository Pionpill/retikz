import type { InputCoordinate } from './coordinate';
import type { InputEmbed } from './embed';
import type { InputNode } from './node';
import type { InputPath } from './path';
import type { InputChild, InputLayer, InputScene, InputSceneChildren, InputSceneLayers } from './scene';
import type { InputScope } from './scope';

/** 创建作者侧节点输入，身份由配置中的 id 声明 */
export const node = (config: Omit<InputNode, 'type'>): InputNode => ({ type: 'node', ...config });

/** 创建作者侧命名坐标输入 */
export const coordinate = (config: Omit<InputCoordinate, 'type'>): InputCoordinate => ({
  type: 'coordinate',
  ...config,
});

/** 创建作者侧路径输入，身份由配置中的 id 声明 */
export const path = (config: Omit<InputPath, 'type'>): InputPath => ({ ...config });

/** 创建作者侧 Scope 输入 */
export const scope = (
  config: Omit<InputScope, 'type' | 'children'>,
  children: ReadonlyArray<InputScope['children'][number]>,
): InputScope => ({ ...config, children });

/** 创建作者侧 Layer 输入 */
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
  (children: ReadonlyArray<InputChild>): InputSceneChildren;
  (input: InputSceneChildrenOptions): InputSceneChildren;
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
