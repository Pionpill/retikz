import type { DiffLineKind, DiffMode, UnifiedDiff } from '../types';

/** 按 mode 过滤 unified diff。 */
export const filterDiffByMode = (diff: UnifiedDiff, mode: Exclude<DiffMode, 'off'>): UnifiedDiff => {
  if (mode === 'full') return diff;
  const lines = diff.code.split('\n');
  const skipKind: DiffLineKind = mode === 'added' ? 'removed' : 'added';
  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  for (let i = 0; i < lines.length; i++) {
    if (diff.lineKinds[i] === skipKind) continue;
    outLines.push(lines[i]);
    outKinds.push(diff.lineKinds[i]);
  }
  return { code: outLines.join('\n'), lineKinds: outKinds };
};

/** 按行对比两段源码，生成 unified diff。 */
export const computeUnifiedDiff = (baseline: string, current: string): UnifiedDiff => {
  const a = baseline.split('\n');
  const b = current.split('\n');
  const m = a.length;
  const n = b.length;

  const lcs: Array<Array<number>> = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      outLines.push(b[j]);
      outKinds.push('context');
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      outLines.push(a[i]);
      outKinds.push('removed');
      i++;
    } else {
      outLines.push(b[j]);
      outKinds.push('added');
      j++;
    }
  }
  while (i < m) {
    outLines.push(a[i]);
    outKinds.push('removed');
    i++;
  }
  while (j < n) {
    outLines.push(b[j]);
    outKinds.push('added');
    j++;
  }

  return { code: outLines.join('\n'), lineKinds: outKinds };
};
