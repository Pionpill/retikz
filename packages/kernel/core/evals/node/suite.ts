import { parseStaticCssColor } from '@retikz/foundation';
import { toJSONSchema } from 'zod';

import {
  buildSchemaEvalPrompt,
  gradeSchemaAnswer,
  inspectSchemaEvalCoverage,
  isJsonObject,
} from '../../../../../scripts/evals';
import type { SchemaEvalCase, SchemaEvalContract } from '../../../../../scripts/evals';
import type { IRNode } from '../../src';
import { NodeSchema } from '../../src';
import { animationCases } from './cases/animation.eval';
import { identityCases } from './cases/identity.eval';
import { labelCases } from './cases/label.eval';
import { layoutCases } from './cases/layout.eval';
import { paintCases } from './cases/paint.eval';
import { positionCases } from './cases/position.eval';
import { styleCases } from './cases/style.eval';
import { textCases } from './cases/text.eval';
import { transformCases } from './cases/transform.eval';
import { projectNodeAnswer } from './projection';

export type NodeEvalCase = SchemaEvalCase<IRNode>;

/** 节点用例按稳定 ID 排序，文件只负责语义分组 */
export const nodeEvalCases: Array<NodeEvalCase> = [
  ...identityCases,
  ...transformCases,
  ...positionCases,
  ...textCases,
  ...styleCases,
  ...paintCases,
  ...layoutCases,
  ...labelCases,
  ...animationCases,
].sort((left, right) => left.id.localeCompare(right.id));

/** 节点专属的校验与颜色等价，不把领域路径放进共享工具 */
const nodeEvalContract: SchemaEvalContract = {
  validate: input => {
    const parsed = NodeSchema.safeParse(input);
    return parsed.success ? [] : parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
  },
  project: projectNodeAnswer,
  isDiscriminator: path => /\.(type|kind|property)$/.test(path),
  equalLeaf: (expected, actual, path) => {
    const colorPath =
      /^\$\.(style|label|text|animations)(\.|\[)/.test(path) && /\.(color|fill|stroke|textColor|value)$/.test(path);
    if (colorPath && typeof expected === 'string' && typeof actual === 'string') {
      const expectedColor = parseStaticCssColor(expected);
      const actualColor = parseStaticCssColor(actual);
      if (expectedColor && actualColor)
        return (['r', 'g', 'b', 'a'] as const).every(
          channel => Math.abs(expectedColor[channel] - actualColor[channel]) <= 1e-6,
        );
    }
    return expected === actual;
  },
};

/** 保留作者输入的默认、省略、引用与描述 */
export const exportNodeEvalContract = () => toJSONSchema(NodeSchema, { io: 'input', reused: 'ref' });

/** 判分仅消费原始回答，不抽取、修复或重试 */
export const gradeNodeAnswer = (testCase: NodeEvalCase, answer: string) =>
  gradeSchemaAnswer(testCase, answer, nodeEvalContract);

/** 完整节点契约与当前任务，其他用例属性不得发送给模型 */
export const buildNodeEvalPrompt = (testCase: NodeEvalCase) =>
  buildSchemaEvalPrompt(
    exportNodeEvalContract(),
    testCase,
    '根据所附完整输入 JSON Schema 和当前中文任务，只输出一个完整 Node JSON 对象，不加 Markdown、解释或其他对象。未要求覆盖的设置保持省略；题目要求保留的引用、分支和后备配置不得展开或折叠。',
  );

/** 节点宿主诊断边界和动画公共字段复用策略 */
export const inspectNodeEvalCoverage = () =>
  inspectSchemaEvalCoverage(exportNodeEvalContract(), nodeEvalCases, gradeNodeAnswer, {
    isDiagnosticBranch: properties => isJsonObject(properties.property) && properties.property.const === 'viewBox',
    canShareProperty: entry => entry.path.startsWith('$.animations'),
  });
