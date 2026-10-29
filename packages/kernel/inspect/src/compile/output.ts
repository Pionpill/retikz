import type { Scene } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';

/** 深冻结独立快照，不进行 schema 校验 */
export const freezeInspectionValue = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freezeInspectionValue(child);
    Object.freeze(value);
  }
  return value;
};

/** 克隆扩展可见对象，避免改动调用方输入 */
export const snapshotInspectionValue = <T>(value: T): T => freezeInspectionValue(structuredClone(value));

/** 辅助结果移除交互身份与动画，保留独立资源引用闭包 */
export const sealInspectionScene = (scene: Scene): Scene => {
  const output = structuredClone(scene);
  delete output.animations;
  visitSceneContent(output, primitive => {
    delete primitive.id;
    delete primitive.meta;
    delete primitive.animations;
  });
  return freezeInspectionValue(output);
};
