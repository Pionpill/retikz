import { createDataTransformExecutor } from '@retikz/data';
import { DetailColumn } from '@retikz/table-react';
import type { FC } from 'react';
import { useMemo, useState } from 'react';

import type { Lang } from '@/i18n';
import { PreviewDetailTable } from '@/modules/docs/components/component-preview/theme';

import { executionRows } from './external-execution.data';
import { createSortProvider } from './external-execution.engine';
import { externalExecutionI18n } from './external-execution.i18n';

/** 三种执行模式使用相同的内置排序声明 */
export type ExternalExecutionPreviewProps = {
  lang: Lang;
  mode: 'builtin' | 'external' | 'hybrid';
  order: 'ascending' | 'descending';
};

/** 表格展示真实变换结果，计数仅观察外接计算完成 */
export const ExternalExecutionPreview: FC<ExternalExecutionPreviewProps> = props => {
  const { lang, mode, order } = props;
  const [completed, setCompleted] = useState(0);
  const executor = useMemo(
    () =>
      createDataTransformExecutor({
        externalProviders: [
          { name: 'promise-engine', provider: createSortProvider(() => setCompleted(count => count + 1)) },
        ],
      }),
    [],
  );
  const table = useMemo(
    () => (
      <PreviewDetailTable
        id="sorted-records"
        dataRef="records"
        data={executionRows}
        dataExecution={{ mode, external: 'promise-engine' }}
        dataTransformExecutor={executor}
        transform={[{ operation: { kind: 'sort', params: { field: 'value', order } } }]}
        layout={{
          columnSize: { kind: 'fixed', value: 100 },
          rowSize: { kind: 'fixed', value: 30 },
          headerRowSize: { kind: 'fixed', value: 30 },
        }}
      >
        <DetailColumn id="item" field="item" header={{ kind: 'value', value: 'item' }} />
        <DetailColumn id="value" field="value" header={{ kind: 'value', value: 'value' }} />
      </PreviewDetailTable>
    ),
    [mode, order, executor],
  );
  return (
    <div>
      {table}
      <p>
        {externalExecutionI18n[lang].completed}: {completed}
      </p>
    </div>
  );
};
