import type { ExternalRow, IRDataTransform } from '@retikz/data';

import type { PreviewSourceConfig } from '@/modules/docs/preview';

/** 从实际输入与变换声明生成可复制的数据调用及 IR，不包含辅助表格绘制 */
export const buildOperatorSourceViews = (
  name: string,
  rows: Array<ExternalRow>,
  operation: IRDataTransform,
): ReturnType<NonNullable<PreviewSourceConfig['buildViews']>> => {
  const operationCode = JSON.stringify(operation, null, 2);
  return {
    vanilla: {
      files: [
        {
          filename: `${name}.vanilla.ts`,
          lang: 'ts',
          code: [
            "import { applyTransforms } from '@retikz/data';",
            "import type { ExternalRow, IRDataTransform } from '@retikz/data';",
            '',
            `const rows: Array<ExternalRow> = ${JSON.stringify(rows, null, 2)};`,
            '',
            `const operation = ${operationCode} satisfies IRDataTransform;`,
            '',
            'export const result = applyTransforms(rows, [operation]);',
          ].join('\n'),
        },
      ],
    },
    ir: { files: [{ filename: `${name}.ir.json`, code: operationCode, lang: 'json' }] },
  };
};
