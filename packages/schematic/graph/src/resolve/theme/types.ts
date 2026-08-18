import type { IRGraphEntityThemeTokenRules, IRGraphThemeTokenResolution } from '../../schemas';

/** 当前 Core Theme 下确定的 Graph baseline 与 style rules */
export type GraphThemeResolution = Readonly<{
  tokens: IRGraphThemeTokenResolution;
  tokenRules: IRGraphEntityThemeTokenRules;
}>;
