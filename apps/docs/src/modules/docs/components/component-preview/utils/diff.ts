import type { DiffLineKind, UnifiedDiff } from '../types';

/** 按行对比两段源码并生成 unified diff。 */
export const computeUnifiedDiff = (baseline: string, current: string): UnifiedDiff => {
  const baselineLines = baseline.split('\n');
  const currentLines = current.split('\n');
  const baselineLength = baselineLines.length;
  const currentLength = currentLines.length;

  const lcs: Array<Array<number>> = Array.from({ length: baselineLength + 1 }, () =>
    new Array<number>(currentLength + 1).fill(0),
  );
  for (let baselineIndex = baselineLength - 1; baselineIndex >= 0; baselineIndex--) {
    for (let currentIndex = currentLength - 1; currentIndex >= 0; currentIndex--) {
      lcs[baselineIndex][currentIndex] =
        baselineLines[baselineIndex] === currentLines[currentIndex]
          ? lcs[baselineIndex + 1][currentIndex + 1] + 1
          : Math.max(lcs[baselineIndex + 1][currentIndex], lcs[baselineIndex][currentIndex + 1]);
    }
  }

  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  let baselineIndex = 0;
  let currentIndex = 0;
  while (baselineIndex < baselineLength && currentIndex < currentLength) {
    if (baselineLines[baselineIndex] === currentLines[currentIndex]) {
      outLines.push(currentLines[currentIndex]);
      outKinds.push('context');
      baselineIndex++;
      currentIndex++;
    } else if (lcs[baselineIndex + 1][currentIndex] >= lcs[baselineIndex][currentIndex + 1]) {
      outLines.push(baselineLines[baselineIndex]);
      outKinds.push('removed');
      baselineIndex++;
    } else {
      outLines.push(currentLines[currentIndex]);
      outKinds.push('added');
      currentIndex++;
    }
  }
  while (baselineIndex < baselineLength) {
    outLines.push(baselineLines[baselineIndex]);
    outKinds.push('removed');
    baselineIndex++;
  }
  while (currentIndex < currentLength) {
    outLines.push(currentLines[currentIndex]);
    outKinds.push('added');
    currentIndex++;
  }

  return { code: outLines.join('\n'), lineKinds: outKinds };
};
