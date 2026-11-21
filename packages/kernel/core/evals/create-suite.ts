import { toJSONSchema } from 'zod';
import type { ZodType } from 'zod';

import { buildSchemaEvalPrompt, gradeSchemaAnswer } from '../../../../scripts/evals';
import type { SchemaEvalCase, SchemaEvalContract } from '../../../../scripts/evals';

/** 配对题的答案也是本题通过 Zod、但不符合题意的反例 */
export type CoreEvalCase<T> = SchemaEvalCase<T> & { contrastId?: string };

/** 将题库绑定到实际作者输入契约；校验原始 JSON，不以解析后的默认值替代答案 */
export const createEvalSuite = <T>(
  schema: ZodType,
  cases: Array<CoreEvalCase<T>>,
  equalLeaf?: SchemaEvalContract['equalLeaf'],
) => {
  const contract = toJSONSchema(schema, { io: 'input', reused: 'ref' });
  const grade = (item: SchemaEvalCase<T>, answer: string) =>
    gradeSchemaAnswer(item, answer, {
      validate(input) {
        const parsed = schema.safeParse(input);
        return parsed.success ? [] : parsed.error.issues.map(issue => issue.path.join('.') + ': ' + issue.message);
      },
      project: input => input,
      equalLeaf,
      isDiscriminator: path => /\.(type|kind|property|via)$/.test(path),
    });
  return {
    cases,
    contract,
    grade,
    prompt: (item: SchemaEvalCase<T>) =>
      buildSchemaEvalPrompt(
        contract,
        item,
        '根据完整作者输入契约完成任务，只输出一个 JSON 值。保留题意指定的表达和顺序；未要求的配置保持省略。',
      ),
  };
};
