import { expect, it } from 'vitest';

import { suite } from '../suite';

it('标签的 CSS 同色表达通过，但路径整体着色不能代替标签着色', () => {
  const item = suite.cases.find(candidate => candidate.id === 'P019')!;
  const raw = JSON.stringify(item.expected);
  expect(suite.grade(item, raw.replace('"red"', '"#ff0000"')).success).toBe(true);
  const misplaced = { ...item.expected, style: { color: 'red' } };
  const label = misplaced.label;
  if (!label || Array.isArray(label)) throw new Error('P019 requires a single label');
  misplaced.label = { ...label };
  delete misplaced.label.textColor;
  const score = suite.grade(item, JSON.stringify(misplaced));
  expect(score.schemaValid).toBe(true);
  expect(score.success).toBe(false);
});

it('保留相对基点和推进相对基点不是等价表达', () => {
  const item = suite.cases.find(candidate => candidate.id === 'P003')!;
  const raw = JSON.stringify(item.expected).replace('"relativeAccumulate"', '"relative"');
  const score = suite.grade(item, raw);
  expect(score.schemaValid).toBe(true);
  expect(score.success).toBe(false);
});
