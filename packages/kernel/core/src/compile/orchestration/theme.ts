import type { IRTheme } from '../../schemas';
import type { ResolvedTheme } from '../../shared';

import { ThemeSchema } from '../../schemas';
import { ThemeMode, ThemeStyle } from '../../shared';

/** Core compile 的冻结 Theme 基线 */
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = Object.freeze({
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
});

/**
 * 解析一层稀疏 Theme 覆盖
 * @description 省略覆盖时复用父对象；显式覆盖先校验严格 IR，再按字段生成冻结的完整 Theme
 */
export const resolveTheme = (parent: ResolvedTheme, sparse: IRTheme | undefined, path: string): ResolvedTheme => {
  if (sparse === undefined) return parent;
  const parsed = ThemeSchema.safeParse(sparse);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const issueSegments = issue.path.map(String);
    if (issue.code === 'unrecognized_keys') issueSegments.push(issue.keys[0]);
    const issuePath = issueSegments.length === 0 ? path : `${path}.${issueSegments.join('.')}`;
    throw new Error(`Invalid Theme at ${issuePath}: ${issue.message}`, {
      cause: parsed.error,
    });
  }
  return Object.freeze({
    style: parsed.data.style ?? parent.style,
    mode: parsed.data.mode ?? parent.mode,
  });
};
