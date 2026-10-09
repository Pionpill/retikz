import { createDataTransformExecutor } from '@retikz/data';
import { Plot, PlotAxis, BuiltinPlotScale, PlotTransform, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';
import { useMemo, useState } from 'react';

import type { Lang } from '@/i18n';

import { scaleField, scaleFieldImplementation } from './extension-transform-preview';
import { customTransformRows } from './extension-transform.data';
import { createScaleFieldProvider } from './external-execution.engine';
import { externalExecutionI18n } from './external-execution.i18n';

/** 执行配置与同语义派生字段的对照参数 */
export type ExternalExecutionPreviewProps = { lang: Lang; mode: 'builtin' | 'external' | 'hybrid'; factor: number };

/** 实际Plot准备由共享宿主管理，计数只观察外接计算完成 */
export const ExternalExecutionPreview: FC<ExternalExecutionPreviewProps> = props => {
  const { lang, mode, factor } = props;
  const [completed, setCompleted] = useState(0);
  const executor = useMemo(
    () =>
      createDataTransformExecutor({
        transformImplementations: [scaleFieldImplementation],
        externalProviders: [
          { name: 'promise-engine', provider: createScaleFieldProvider(() => setCompleted(count => count + 1)) },
        ],
      }),
    [],
  );

  const chart = useMemo(
    () => (
      <Plot
        data={customTransformRows}
        width={420}
        height={260}
        transformDefinitions={[scaleField]}
        transformImplementations={[scaleFieldImplementation]}
        dataExecution={{ mode, external: 'promise-engine' }}
        dataTransformExecutor={executor}
      >
        <PlotTransform operation={{ kind: 'scale-field', params: { field: 'x', as: 'scaledX', factor } }} />
        <BuiltinPlotScale dimension="x" type="linear" domain={[0, 16]} />
        <PointMark x="x" y="y" fill="#94a3b8" size={5} />
        <PointMark x="scaledX" y="y" fill="#2563eb" size={7} />
        <PlotAxis dimension="x" /> <PlotAxis dimension="y" grid />
      </Plot>
    ),
    [mode, factor, executor],
  );

  return (
    <div>
      {chart}
      <p>
        {externalExecutionI18n[lang].completed}: {completed}
      </p>
    </div>
  );
};
