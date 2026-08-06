import type { FrameDescriptionProps, FrameProps, FrameTitleProps } from '@retikz/standard-react';
import type { FC, ReactNode } from 'react';

import { Frame, FrameDescription, FrameTitle } from '@retikz/standard-react';
import { Children, createElement, Fragment, isValidElement } from 'react';

/** 文档逻辑图分组框接受的 Standard Frame 属性 */
export type LogicFrameProps = FrameProps;

/** 文档逻辑图分组标题接受的 Standard FrameTitle 属性 */
export type LogicFrameTitleProps = FrameTitleProps;

/** 文档逻辑图分组说明接受的 Standard FrameDescription 属性 */
export type LogicFrameDescriptionProps = FrameDescriptionProps;

const logicFrameDefaults = {
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
} satisfies Partial<LogicFrameProps>;

const resolveLogicFrameBorder = (border: LogicFrameProps['border']): NonNullable<LogicFrameProps['border']> => ({
  ...logicFrameDefaults.border,
  ...border,
  style: {
    ...logicFrameDefaults.border.style,
    ...border?.style,
  },
});

const withLogicFrameTitleDefaults = (props: LogicFrameTitleProps): LogicFrameTitleProps => ({
  textColor: 'gray',
  ...props,
  font: { size: 12, weight: 'normal', ...props.font },
});

const withLogicFrameDescriptionDefaults = (props: LogicFrameDescriptionProps): LogicFrameDescriptionProps => ({
  textColor: 'gray',
  opacity: 0.7,
  ...props,
  font: { size: 11, ...props.font },
});

/** 把 LogicFrame 的语义标题转换为 Standard Frame 可直接消费的组成部分 */
const resolveLogicFrameChildren = (children: ReactNode): ReactNode =>
  Children.map(children, child => {
    if (!isValidElement(child)) return child;
    if (child.type === Fragment) {
      return createElement(
        Fragment,
        { key: child.key },
        resolveLogicFrameChildren((child.props as { children?: ReactNode }).children),
      );
    }
    if (isValidElement<LogicFrameTitleProps>(child) && child.type === LogicFrameTitle) {
      return createElement(FrameTitle, { key: child.key, ...withLogicFrameTitleDefaults(child.props) });
    }
    if (isValidElement<LogicFrameDescriptionProps>(child) && child.type === LogicFrameDescription) {
      return createElement(FrameDescription, {
        key: child.key,
        ...withLogicFrameDescriptionDefaults(child.props),
      });
    }
    return child;
  });

/** 使用逻辑图默认样式组合 Standard Frame，并允许显式属性覆盖 */
export const LogicFrame: FC<LogicFrameProps> = props => {
  const { children, border, ...frameProps } = props;

  return createElement(Frame, {
    ...logicFrameDefaults,
    ...frameProps,
    border: resolveLogicFrameBorder(border),
    children: resolveLogicFrameChildren(children),
  });
};

LogicFrame.displayName = 'LogicFrame';

/** 声明逻辑图分组标题，只能作为 LogicFrame 的直接组成部分 */
export const LogicFrameTitle: FC<LogicFrameTitleProps> = () => {
  throw new Error('LogicFrameTitle must be used as a direct child of LogicFrame.');
};

LogicFrameTitle.displayName = 'LogicFrameTitle';

/** 声明逻辑图分组说明，只能作为 LogicFrame 的直接组成部分 */
export const LogicFrameDescription: FC<LogicFrameDescriptionProps> = () => {
  throw new Error('LogicFrameDescription must be used as a direct child of LogicFrame.');
};

LogicFrameDescription.displayName = 'LogicFrameDescription';
