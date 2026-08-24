import type { ReactNode } from 'react';

import { Fragment, isValidElement } from 'react';

import type { ScatterChartMark, ScatterMarkProps } from './marks';

import { RetikzChartReactError } from '../../error';
import { ScatterMark } from './marks';

/** 从 Point Chart 直接 children 中提取有序 Chart marks */
export const pointMarksOf = (children: ReactNode): Array<ScatterChartMark> => {
  const marks: Array<ScatterChartMark> = [];
  const visit = (value: ReactNode): void => {
    if (value === null || value === undefined || typeof value === 'boolean') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (isValidElement(value) && value.type === Fragment) {
      visit(value.props.children as ReactNode);
      return;
    }
    if (isValidElement(value) && value.type === ScatterMark) {
      const props = value.props as ScatterMarkProps;
      marks.push({ ...props, kind: 'scatter' });
      return;
    }
    throw new RetikzChartReactError(
      'chart react: Point Chart children accept only presentation markers or ScatterMark as direct children',
    );
  };
  visit(children);
  return marks;
};
