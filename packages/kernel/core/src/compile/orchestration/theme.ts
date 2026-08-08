import type { IRTheme } from '../../schemas';
import type { ResolvedTheme } from '../../shared';

import { resolveCoreThemeColors } from '../../providers/theme';
import { ThemeSchema } from '../../schemas';
import { ThemeMode, ThemeStyle } from '../../shared';

/** Core compile 的冻结 Theme 基线 */
export const DEFAULT_RESOLVED_THEME: ResolvedTheme = Object.freeze({
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
  colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
});

/**
 * 解析一层 sparse Theme 覆盖
 * @description 验证 Theme selector 后按字段继承，并重新生成共享 colors
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

  const style = parsed.data.style ?? parent.style;
  const mode = parsed.data.mode ?? parent.mode;
  if (style === parent.style && mode === parent.mode) return parent;

  return Object.freeze({ style, mode, colors: resolveCoreThemeColors(style, mode) });
};
