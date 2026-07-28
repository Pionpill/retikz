import type { ExternalRow, IRDataModel } from '@retikz/data';
import type { ReactNode } from 'react';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';
import { Component } from 'react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { validationPolicyControls } from './validation-policy.controls';

import { allInvalidRows, cleanRows, dirtyRows } from './validation-policy.data';

type ValidationPolicyValues = PreviewControlValuesFor<typeof validationPolicyControls>;

type ValidationErrorBoundaryProps = {
  children: ReactNode;
  message: string;
};

type ValidationErrorBoundaryState = {
  error: Error | null;
};

/** 把真实 Plot 校验错误限制在 demo 输出区内 */
class ValidationErrorBoundary extends Component<ValidationErrorBoundaryProps, ValidationErrorBoundaryState> {
  override state: ValidationErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ValidationErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(): void {}

  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="flex min-h-56 items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {this.props.message}: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

const model: IRDataModel = [
  { name: 'month', type: 'categorical' },
  { name: 'revenue', type: 'continuous' },
];

/** 按数据与校验策略渲染真实 Plot 校验结果 */
export const renderValidationPolicyPreview = (values: ValidationPolicyValues, message: string) => {
  const data: Array<ExternalRow> =
    values.dataset === 'clean' ? cleanRows : values.dataset === 'allInvalid' ? allInvalidRows : dirtyRows;
  const invalid = values.policy === 'error' ? 'error' : 'skip';
  const validateData = values.policy === 'sample' ? { sampleRows: 100 } : undefined;

  return (
    <ValidationErrorBoundary key={`${values.dataset}-${values.policy}`} message={message}>
      <Plot
        data={data}
        model={model}
        invalid={invalid}
        validateData={validateData}
        width={410}
        height={250}
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        <IntervalMark x="month" y="revenue" color="month" />
        <Scale dimension="y" type="linear" domainPadding={0} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </ValidationErrorBoundary>
  );
};
