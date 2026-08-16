import type { FrameDescriptionProps, FrameProps, FrameTitleProps } from '@retikz/standard-react';
import type { FC, ReactNode } from 'react';

import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';
import { Children, createElement, Fragment, isValidElement } from 'react';

/** 文档逻辑图分组框接受的 Standard Frame 属性 */
export type LogicFigureFrameProps = FrameProps;

/** 文档逻辑图分组标题接受的 Standard FrameTitle 属性 */
export type LogicFigureFrameTitleProps = FrameTitleProps;

/** 文档逻辑图分组说明接受的 Standard FrameDescription 属性 */
export type LogicFigureFrameDescriptionProps = FrameDescriptionProps;

const graphFrameDefaults = {
  border: {
    style: {
      stroke: 'lightgray',
      fill: 'lightgray',
      fillOpacity: 0.04,
      dashPattern: [4, 3],
    },
    cornerRadius: 4,
  },
  padding: 10,
} satisfies Partial<LogicFigureFrameProps>;

const resolveLogicFigureFrameBorder = (
  border: LogicFigureFrameProps['border'],
): NonNullable<LogicFigureFrameProps['border']> => ({
  ...graphFrameDefaults.border,
  ...border,
  style: {
    ...graphFrameDefaults.border.style,
    ...border?.style,
  },
});

const withLogicFigureFrameTitleDefaults = (props: LogicFigureFrameTitleProps): LogicFigureFrameTitleProps => ({
  textColor: 'gray',
  ...props,
  font: { size: 12, weight: 'normal', ...props.font },
});

const withLogicFigureFrameDescriptionDefaults = (
  props: LogicFigureFrameDescriptionProps,
): LogicFigureFrameDescriptionProps => ({
  textColor: 'gray',
  opacity: 0.7,
  ...props,
  font: { size: 11, ...props.font },
});

/** 把 LogicFigureFrame 的语义标题转换为 Standard Frame 可直接消费的组成部分 */
const resolveLogicFigureFrameChildren = (children: ReactNode): ReactNode =>
  Children.map(children, child => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      return createElement(
        Fragment,
        { key: child.key },
        resolveLogicFigureFrameChildren((child.props as { children?: ReactNode }).children),
      );
    }
    if (isValidElement<LogicFigureFrameTitleProps>(child) && child.type === LogicFigureFrameTitle) {
      return createElement(FrameTitle, { key: child.key, ...withLogicFigureFrameTitleDefaults(child.props) });
    }
    if (isValidElement<LogicFigureFrameDescriptionProps>(child) && child.type === LogicFigureFrameDescription) {
      return createElement(FrameDescription, {
        key: child.key,
        ...withLogicFigureFrameDescriptionDefaults(child.props),
      });
    }
    return child;
  });

/** 使用逻辑图默认样式组合 Standard Frame，并允许显式属性覆盖 */
export const LogicFigureFrame: FC<LogicFigureFrameProps> = props => {
  const { children, border, ...frameProps } = props;

  return createElement(Frame, {
    ...graphFrameDefaults,
    ...frameProps,
    border: resolveLogicFigureFrameBorder(border),
    children: resolveLogicFigureFrameChildren(children),
  });
};

LogicFigureFrame.displayName = 'LogicFigureFrame';

/** 声明逻辑图分组标题，只能作为 LogicFigureFrame 的直接组成部分 */
export const LogicFigureFrameTitle: FC<LogicFigureFrameTitleProps> = () => {
  throw new Error('LogicFigureFrameTitle must be used as a direct child of LogicFigureFrame.');
};

LogicFigureFrameTitle.displayName = 'LogicFigureFrameTitle';

/** 声明逻辑图分组说明，只能作为 LogicFigureFrame 的直接组成部分 */
export const LogicFigureFrameDescription: FC<LogicFigureFrameDescriptionProps> = () => {
  throw new Error('LogicFigureFrameDescription must be used as a direct child of LogicFigureFrame.');
};

LogicFigureFrameDescription.displayName = 'LogicFigureFrameDescription';
