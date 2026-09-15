import type { IRNode, ResolvedTheme } from '@retikz/core';
import type { SurfaceInput } from '@retikz/standard';

import type { IRGraphDefaults, IRGraphRule } from '../../schemas';

/** 代码实体内部共享的有限视觉角色 */
export type CodeBlockTokens = Readonly<{
  /** 标题、成员名称与逻辑正文颜色 */
  textColor: NonNullable<NonNullable<IRNode['style']>['textColor']>;
  /** 说明、类型与默认 trail 颜色 */
  mutedTextColor: NonNullable<NonNullable<IRNode['style']>['textColor']>;
  /** 默认 icon 颜色 */
  accentColor: NonNullable<NonNullable<IRNode['style']>['textColor']>;
  /** 签名与方法名称字体 */
  codeFontFamily: NonNullable<NonNullable<NonNullable<IRNode['style']>['font']>['family']>;
  /** 内容分区背景；省略使用基础 Section 默认 */
  sectionBackground?: SurfaceInput['background'];
}>;

/** 当前 Core Theme 下确定的 Graph defaults 与 ordered rules */
export type GraphThemeStyleResolution = Readonly<{
  /** 已确定的稀疏 Graph Source defaults */
  defaults: IRGraphDefaults;
  /** 代码实体的有效视觉 token */
  codeBlockTokens: CodeBlockTokens;
  /** Neutral 与 named definition 生成的有序 Graph rules */
  rules: ReadonlyArray<IRGraphRule>;
}>;

/** Graph Theme style 作者相对 Neutral preset 提供的稀疏 defaults/rules */
export type GraphThemeStyleSource = Readonly<{
  /** 可选稀疏 Graph Source defaults */
  defaults?: IRGraphDefaults;
  /** 相对 Neutral 的稀疏代码实体视觉 token */
  codeBlockTokens?: Partial<CodeBlockTokens>;
  /** 可选有序 Graph Source rules */
  rules?: ReadonlyArray<IRGraphRule>;
}>;

/** 为一个 Core Theme style 解析 Graph-owned defaults/rules 的运行时定义 */
export type GraphThemeStyleDefinition = Readonly<{
  /** 与 Core Theme style 对齐的开放名称 */
  name: string;
  /** 从当前位置完整 Core Theme 解析 Graph defaults/rules 稀疏片段 */
  resolve: (theme: ResolvedTheme) => GraphThemeStyleSource;
}>;
