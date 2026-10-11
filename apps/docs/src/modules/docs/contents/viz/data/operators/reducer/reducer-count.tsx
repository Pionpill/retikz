import type { FC } from 'react';

import type { Lang } from '@/i18n';
import type { PreviewSourceConfig } from '@/modules/docs/preview';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControlContract } from './reducer-count.controls';
import { reducerCountOperationOf, reducerCountRows } from './reducer-count.data';
import { ReducerCountPreview } from './reducer-count.preview';

/** 注册回退使用同一份控件定义 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <ReducerCountPreview {...values} />
));
/** 源码视图展示计数的数据调用与变换声明，表格沿用交互预览 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: () => {
    const operationCode = JSON.stringify(reducerCountOperationOf(previewControlContract.canonicalValues), null, 2);
    const rowsCode = JSON.stringify(reducerCountRows, null, 2);
    return {
      vanilla: {
        files: [
          {
            filename: 'reducer-count.vanilla.ts',
            lang: 'ts',
            code: [
              "import { applyTransforms } from '@retikz/data';",
              "import type { ExternalRow, IRDataTransform } from '@retikz/data';",
              '',
              `const rows: Array<ExternalRow> = ${rowsCode};`,
              '',
              `const operation = ${operationCode} satisfies IRDataTransform;`,
              '',
              'export const { rows: result } = applyTransforms(rows, [operation]);',
            ].join('\n'),
          },
        ],
      },
      ir: {
        files: [{ filename: 'reducer-count.ir.json', code: operationCode, lang: 'json' }],
      },
    };
  },
} satisfies PreviewSourceConfig;
/** 计数演示的语言输入 */
export type ReducerCountProps = { lang?: Lang };
const Demo: FC<ReducerCountProps> = props => {
  const { lang = 'zh' } = props;
  const values = usePreviewControls(createPreviewControlContract(lang).controls);
  return <ReducerCountPreview {...values} lang={lang} />;
};
export default Demo;
