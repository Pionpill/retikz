import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { BuiltinLayerName } from './types';
import type { InputLayer, InputScene } from './types';

/** 读取显式层级或内置图层的默认层级 */
export const layerZIndex = (layer: InputLayer): number =>
  layer.zIndex ?? (layer.name === BuiltinLayerName.Background ? 0 : layer.name === BuiltinLayerName.Overlay ? 100 : 10);

/** 将直接子项包装为主层；显式图层检查重名后按层级稳定排序 */
export const normalizeSceneLayers = (scene: InputScene): Array<InputLayer> => {
  if (scene.layers === undefined) return [{ type: 'layer', name: BuiltinLayerName.Main, children: scene.children }];
  const names = new Set<string>();
  for (const { name } of scene.layers) {
    if (names.has(name))
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, 'Duplicate layer name: ' + name);
    names.add(name);
  }
  return [...scene.layers].sort((left, right) => layerZIndex(left) - layerZIndex(right));
};
