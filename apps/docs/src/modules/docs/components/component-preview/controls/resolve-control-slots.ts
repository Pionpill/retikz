import type { PreviewControlSlot, PreviewControlsOptions } from '../types';
import type { PreviewIR } from '../utils';

import { irHasAnimations } from '../utils';
import { buildAnimationControlSlots } from './animation-controls';

/** 内置预览控制 provider 的解析上下文。 */
export type PreviewControlProviderContext = {
  /** 当前可用的预览 IR；无法派生时为 null。 */
  previewIr: PreviewIR | null;
  /** 当前预览控制配置。 */
  options: PreviewControlsOptions;
};

/** 内置预览控制 provider。 */
export type PreviewControlProvider = {
  /** provider 的稳定 id。 */
  id: string;
  /** 根据预览上下文生成控制插槽。 */
  resolve: (context: PreviewControlProviderContext) => Array<PreviewControlSlot>;
};

const animationControlProvider: PreviewControlProvider = {
  id: 'animation',
  resolve: context => {
    const { previewIr, options } = context;
    const enabled = options.animation ?? (previewIr !== null && irHasAnimations(previewIr.ir));
    return enabled ? buildAnimationControlSlots() : [];
  },
};

const builtinPreviewControlProviders: ReadonlyArray<PreviewControlProvider> = Object.freeze([animationControlProvider]);

/** 解析当前预览需要的内置控制插槽。 */
export const resolveBuiltinControlSlots = (context: PreviewControlProviderContext): Array<PreviewControlSlot> =>
  builtinPreviewControlProviders.flatMap(provider => provider.resolve(context));

/** 按输入顺序合并控制插槽，并拒绝重复 id。 */
export const mergePreviewControlSlots = (
  ...groups: Array<ReadonlyArray<PreviewControlSlot> | undefined>
): Array<PreviewControlSlot> => {
  const result: Array<PreviewControlSlot> = [];
  const ids = new Set<string>();
  for (const group of groups) {
    for (const slot of group ?? []) {
      if (ids.has(slot.id)) {
        throw new Error(`Duplicate preview control slot id: "${slot.id}".`);
      }
      ids.add(slot.id);
      result.push(slot);
    }
  }
  return result;
};
