import { createDataTransformExecutor } from '@retikz/data';
import type { DataTransformResult } from '@retikz/data';
import { prepareTableData } from '@retikz/table';
import { Table } from '@retikz/table-react';
import { detailTable } from '@retikz/table-vanilla';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { Lang } from '@/i18n';

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
  const spec = useMemo(
    () =>
      detailTable({
        id: 'sorted-records',
        dataRef: 'records',
        dataExecution: { mode, external: 'promise-engine' },
        transform: [{ operation: { kind: 'sort', params: { field: 'value', order } } }],
        columns: ['item', 'value'].map(field => ({ id: field, field, header: { kind: 'value', value: field } })),
        layout: {
          columnSize: { kind: 'fixed', value: 100 },
          rowSize: { kind: 'fixed', value: 30 },
          headerRowSize: { kind: 'fixed', value: 30 },
        },
      }),
    [mode, order],
  );
  const [result, setResult] = useState<{ spec: typeof spec; preparedData: DataTransformResult }>();
  const [failure, setFailure] = useState<Error>();
  useEffect(() => {
    let current = true;
    const load = async () => {
      const task = await prepareTableData(spec, {
        dataBindings: { records: { kind: 'rows', rows: executionRows } },
        dataTransformExecutor: executor,
      });
      const preparedData = await task.execute();
      if (current && preparedData) setResult({ spec, preparedData });
    };
    void load().catch((cause: Error) => {
      if (current) setFailure(cause);
    });
    return () => {
      current = false;
    };
  }, [spec, executor]);
  if (failure) throw failure;
  return (
    <div>
      {result && <Table spec={result.spec} preparedData={result.preparedData} />}
      <p>
        {externalExecutionI18n[lang].completed}: {completed}
      </p>
    </div>
  );
};
