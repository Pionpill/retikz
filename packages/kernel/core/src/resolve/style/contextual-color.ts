import { compositeOpaqueColor } from '@retikz/foundation';

import type { IRContextualColor } from '../../schemas';
import type { ThemeModeValue } from '../../shared';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { ThemeMode } from '../../shared';

/** 上下文颜色确定化所需的最终主色、Theme mode 与诊断路径 */
export type ContextualColorResolveContext = Readonly<{
  /** 完整样式级联后的有效主色 */
  masterColor?: string;
  /** 决定预合成背景色的 Theme 明暗模式 */
  mode: ThemeModeValue;
  /** 当前派生颜色字段的 Source IR 路径 */
  fieldPath: string;
}>;

/** Theme mode 对应的不透明预合成背景色 */
const backdropOf = (mode: ThemeModeValue): '#ffffff' | '#000000' => (mode === ThemeMode.Dark ? '#000000' : '#ffffff');

/**
 * 将上下文颜色确定为 renderer 可直接消费的字符串
 * @description 显式字符串保持 SVG / CSS 原语语义；数值按最终主色与 Theme 背景预合成为不透明颜色
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
