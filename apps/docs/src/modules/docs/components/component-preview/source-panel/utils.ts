import type { ComponentRenderSource, DiffLineKind, DiffMode, SourceView, UnifiedDiff } from '../types';

/** 源码视图的固定展示顺序。 */
const SOURCE_VIEW_ORDER: ReadonlyArray<SourceView> = ['react', 'vanilla', 'ir'];

/** 从源码集合中筛出有文件的可用视图。 */
export const availableSourceViews = (source: ComponentRenderSource): Array<SourceView> =>
  SOURCE_VIEW_ORDER.filter(view => (source[view]?.files.length ?? 0) > 0);

/** 按模式过滤 unified diff。 */
export const filterDiffByMode = (diff: UnifiedDiff, mode: Exclude<DiffMode, 'off'>): UnifiedDiff => {
  if (mode === 'full') return diff;
  const lines = diff.code.split('\n');
  const skipKind: DiffLineKind = mode === 'added' ? 'removed' : 'added';
  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  for (let index = 0; index < lines.length; index++) {
    if (diff.lineKinds[index] === skipKind) continue;
    outLines.push(lines[index]);
    outKinds.push(diff.lineKinds[index]);
  }
  return { code: outLines.join('\n'), lineKinds: outKinds };
};
