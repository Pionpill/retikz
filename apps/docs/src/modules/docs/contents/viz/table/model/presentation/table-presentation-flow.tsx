import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 流程图中一个职责节点的双层文本 */
export type TablePresentationFlowStageLabel = Readonly<{
  /** 稳定职责名称 */
  title: string;
  /** 当前职责的简短说明 */
  detail: string;
}>;

/** Presentation 流程图的全部本地化文本 */
export type TablePresentationFlowLabels = Readonly<{
  /** 内置 preset 与用户 token 形成的外观基线 */
  style: TablePresentationFlowStageLabel;
  /** Cell 局部配置 */
  cell: TablePresentationFlowStageLabel;
  /** 基于原始值的视觉编码 */
  encoding: TablePresentationFlowStageLabel;
  /** 按声明顺序参与级联的 rules */
  rules: TablePresentationFlowStageLabel;
  /** 级联后得到的 Cell 执行计划 */
  plan: TablePresentationFlowStageLabel;
  /** 当前 value Cell 的原始值 */
  raw: TablePresentationFlowStageLabel;
  /** 胜出的 formatter */
  formatter: TablePresentationFlowStageLabel;
  /** 胜出的 Presentation definition */
  presentation: TablePresentationFlowStageLabel;
  /** 最终带样式的 Core child */
  styled: TablePresentationFlowStageLabel;
  /** content Cell 提供的可渲染 payload */
  content: TablePresentationFlowStageLabel;
  /** content Cell 使用的最终样式 */
  contentStyle: TablePresentationFlowStageLabel;
}>;

/** Presentation 流程图属性 */
export type TablePresentationFlowProps = Readonly<{
  /** 当前页面语言对应的职责文本 */
  labels: TablePresentationFlowLabels;
}>;

/** 流程图中单个职责阶段的绘制属性 */
export type StageProps = Readonly<{
  /** 供路径连接使用的稳定节点 id */
  id: string;
  /** 节点中心的横坐标 */
  x?: number;
  /** 节点中心的纵坐标 */
  y: number;
  /** 当前语言下的节点文本 */
  label: TablePresentationFlowStageLabel;
  /** 职责类别使用的描边与浅底颜色 */
  color?: string;
  /** 节点的最小宽度 */
  width?: number;
}>;

/** 绘制流程图中的一个稳定职责阶段 */
const Stage: FC<StageProps> = props => {
  const { id, x = 0, y, label, color = 'gray', width = 190 } = props;
  return (
    <Node
      id={id}
      position={[x, y]}
      minimumSize={{ width, height: 48 }}
      stroke={color}
      fill={color}
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 13, weight: 'bold' }}>{label.title}</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {label.detail}
      </Text>
    </Node>
  );
};

/** 绘制 Cell plan 级联与 value/content 消费路径 */
export const TablePresentationFlow: FC<TablePresentationFlowProps> = props => {
  const { labels } = props;
  return (
    <Layout width={540} height={620} style={{ maxWidth: '100%', height: 'auto' }}>
      <Stage id="style" y={-280} label={labels.style} />
      <Stage id="cell" y={-210} label={labels.cell} />
      <Stage id="encoding" y={-140} label={labels.encoding} />
      <Stage id="rules" y={-70} label={labels.rules} />
      <Stage id="plan" y={10} label={labels.plan} color="darkorange" width={210} />

      <Stage id="raw" x={-180} y={100} label={labels.raw} color="darkorange" width={120} />
      <Stage id="formatter" y={100} label={labels.formatter} width={160} />
      <Stage id="presentation" y={180} label={labels.presentation} width={170} />
      <Stage id="styled" y={270} label={labels.styled} color="dodgerblue" />

      <Stage id="content" x={180} y={100} label={labels.content} color="darkorange" width={120} />
      <Stage id="content-style" x={180} y={180} label={labels.contentStyle} width={150} />

      <Draw way={['style', 'cell']} arrow="->" />
      <Draw way={['cell', 'encoding']} arrow="->" />
      <Draw way={['encoding', 'rules']} arrow="->" />
      <Draw way={['rules', 'plan']} arrow="->" />

      <Draw way={['plan', 'formatter']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
      <Draw way={['raw', 'formatter']} arrow="->" />
      <Draw way={['formatter', 'presentation']} arrow="->" />
      <Draw way={['raw', [-100, 150], 'presentation']} arrow="->" />
      <Draw way={['plan', [95, 50], [95, 160], 'presentation']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
      <Draw way={['presentation', 'styled']} arrow="->" />

      <Draw way={['content', 'content-style']} arrow="->" />
      <Draw way={['plan', 'content-style']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
      <Draw way={['content-style', 'styled']} arrow="->" />
    </Layout>
  );
};
