import type { GroupProps } from '@retikz/graph-react';
import { Group } from '@retikz/graph-react';
import type { FC, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

type LogicFigureFrameCaption = NonNullable<GroupProps['caption']>;
type LogicFigureFrameCaptionText = NonNullable<LogicFigureFrameCaption['title']>;

/** 文档逻辑图分组框接受的 Graph Group 属性 */
export type LogicFigureFrameProps = Omit<GroupProps, 'caption' | 'children'> &
  Readonly<{
    /** 分组内的任意 Graph 或 Core 图元 */
    children?: ReactNode;
  }>;

/** 文档逻辑图分组标题接受的 Graph Group caption 属性 */
export type LogicFigureFrameTitleProps = Omit<LogicFigureFrameCaptionText, 'text'> &
  Readonly<{
    /** 分组标题文本 */
    children: LogicFigureFrameCaptionText['text'];
  }>;

/** 文档逻辑图分组说明接受的 Graph Group caption 属性 */
export type LogicFigureFrameDescriptionProps = Omit<LogicFigureFrameCaptionText, 'text'> &
  Readonly<{
    /** 分组说明文本 */
    children: LogicFigureFrameCaptionText['text'];
  }>;

type LogicFigureFrameParts = Readonly<{
  body: Array<ReactNode>;
  title?: LogicFigureFrameTitleProps;
  description?: LogicFigureFrameDescriptionProps;
}>;

const logicFigureFrameDefaults = {
  background: { fill: 'lightgray', fillOpacity: 0.04 },
  border: { stroke: 'lightgray', dashPattern: [4, 3] },
  cornerRadius: 4,
  padding: 10,
} satisfies Partial<LogicFigureFrameProps>;

const withLogicFigureFrameTitleDefaults = (props: LogicFigureFrameTitleProps): LogicFigureFrameCaptionText => {
  const { children, ...caption } = props;
  return {
    ...caption,
    text: children,
    textColor: caption.textColor ?? 'gray',
    font: { size: 12, weight: 'normal', ...caption.font },
  };
};

const withLogicFigureFrameDescriptionDefaults = (
  props: LogicFigureFrameDescriptionProps,
): LogicFigureFrameCaptionText => {
  const { children, ...caption } = props;
  return {
    ...caption,
    text: children,
    textColor: caption.textColor ?? 'gray',
    opacity: caption.opacity ?? 0.7,
    font: { size: 11, ...caption.font },
  };
};

/** 从透明 Fragment 与直接 children 收集分组标题、说明及 body */
const readLogicFigureFrameParts = (children: ReactNode): LogicFigureFrameParts => {
  const result: {
    body: Array<ReactNode>;
    title?: LogicFigureFrameTitleProps;
    description?: LogicFigureFrameDescriptionProps;
  } = {
    body: [],
  };
  const visit = (nodes: ReactNode): void => {
    Children.forEach(nodes, child => {
      if (isValidElement(child) && child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }
      if (isValidElement<LogicFigureFrameTitleProps>(child) && child.type === LogicFigureFrameTitle) {
        if (result.title !== undefined) throw new Error('LogicFigureFrame accepts at most one LogicFigureFrameTitle.');
        result.title = child.props;
        return;
      }
      if (isValidElement<LogicFigureFrameDescriptionProps>(child) && child.type === LogicFigureFrameDescription) {
        if (result.description !== undefined)
          throw new Error('LogicFigureFrame accepts at most one LogicFigureFrameDescription.');
        result.description = child.props;
        return;
      }
      result.body.push(child);
    });
  };
  visit(children);
  return result;
};

/** 使用 Graph Group 作为逻辑图语义边界，使其同时容纳 Core Node 与 Graph Entity */
export const LogicFigureFrame: FC<LogicFigureFrameProps> = props => {
  const { children, background, border, ...frameProps } = props;
  const parts = readLogicFigureFrameParts(children);
  const title = parts.title === undefined ? undefined : withLogicFigureFrameTitleDefaults(parts.title);
  const description =
    parts.description === undefined ? undefined : withLogicFigureFrameDescriptionDefaults(parts.description);

  return (
    <Group
      {...logicFigureFrameDefaults}
      {...frameProps}
      background={{ ...logicFigureFrameDefaults.background, ...background }}
      border={{ ...logicFigureFrameDefaults.border, ...border }}
      caption={
        title === undefined && description === undefined
          ? undefined
          : {
              ...(title === undefined ? {} : { title }),
              ...(description === undefined ? {} : { description }),
            }
      }
    >
      {parts.body}
    </Group>
  );
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
