import type { ResolvedTheme, ThemeModeValue } from '@retikz/core';

import type { IRTableDefaults } from '../../schemas';
import type { DeepReadonly } from '../../shared';

/** Table style resolver 使用的 Core effective Theme 形态 */
export type TableThemeContext = Pick<ResolvedTheme, 'style' | 'mode' | 'colors'>;

/** Table defaults 来源在 resolver inspection 中的稳定分类 */
export type TableThemeDefaultsLayerKind = 'neutral' | 'style';

/** 一个实际参与 Table defaults cascade 的来源层 */
export type TableThemeDefaultsSource = DeepReadonly<{
  /** 来源分类 */
  kind: TableThemeDefaultsLayerKind;
  /** 稳定来源路径 */
  path: string;
  /** 该来源贡献的稀疏 defaults */
  defaults?: IRTableDefaults;
}>;

/** Table defaults resolver 的完整环境与来源结果 */
export type TableThemeDefaultsResolution = DeepReadonly<{
  /** 可选的有效 Core style 名称 */
  style?: string;
  /** 有效 Core Theme mode */
  mode: ThemeModeValue;
  /** baseline 与 style definition 合并后的 defaults */
  defaults: IRTableDefaults;
  /** 按实际级联顺序排列的 defaults 来源 */
  layers: ReadonlyArray<TableThemeDefaultsSource>;
}>;
