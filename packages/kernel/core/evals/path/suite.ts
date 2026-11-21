import { PathSchema } from '../../src/schemas';
import { createEvalSuite } from '../create-suite';
import { cases } from './cases/path.eval';

/** PathSchema 的提示与判分入口 */
export const suite = createEvalSuite(PathSchema, cases, (expected, actual, path) => {
  if (
    typeof expected !== 'string' ||
    typeof actual !== 'string' ||
    !/^\$\.(?:arrow\.(?:start|end)|style|label(?:\[\d+\])?)\.(?:color|fill|stroke|textColor)$/.test(path)
  )
    return expected === actual;
  const left = parseStaticCssColor(expected);
  const right = parseStaticCssColor(actual);
  return left && right
    ? (['r', 'g', 'b', 'a'] as const).every(channel => Math.abs(left[channel] - right[channel]) <= 1e-6)
    : expected === actual;
});
import { parseStaticCssColor } from '@retikz/foundation';
