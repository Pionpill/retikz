import { compositeOpaqueColor } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRContextualColor } from '../../schemas';
import { ThemeMode } from '../../shared';

/** 解析数值颜色所需的主色、主题明暗模式和错误定位信息 */
export type ContextualColorResolveContext = Readonly<{
  /** 完成样式继承与覆盖后的主色 */
  masterColor?: string;
  /** 用于选择混色背景的主题明暗模式 */
  mode: ThemeMode;
  /** 当前颜色字段的 IR 路径，用于错误定位 */
  fieldPath: string;
}>;

/** 浅色模式使用白色背景，深色模式使用黑色背景 */
const backdropOf = (mode: ThemeMode): '#ffffff' | '#000000' => (mode === ThemeMode.Dark ? '#000000' : '#ffffff');

/**
 * 将颜色字符串或主色混合比例解析为颜色字符串
 * @description 字符串原样返回；数值作为主色原有不透明度的倍率，与主题对应的黑色或白色背景混合后输出不透明颜色
 * @throws 数值不在 0 到 1 之间、缺少主色或主色无法参与混色时抛出 RetikzCoreError
 */
export const resolveContextualColor = (value: IRContextualColor, context: ContextualColorResolveContext): string => {
  if (typeof value === 'string') return value;

  const { fieldPath, masterColor, mode } = context;
  if (masterColor === undefined) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      `Cannot resolve contextual color at '${fieldPath}': master color is missing.`,
      {
        details: { fieldPath, value, mode },
      },
    );
  }

  try {
    return compositeOpaqueColor(masterColor, backdropOf(mode), value);
  } catch (cause) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      `Cannot resolve contextual color at '${fieldPath}' from master '${masterColor}'.`,
      {
        details: { fieldPath, value, masterColor, mode },
        cause,
      },
    );
  }
};
