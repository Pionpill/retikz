import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 位置比例尺解析流程图的本地化文字 */
export type ScalePositionFlowLabels = {
  /** 输入阶段标题 */
  inputsTitle: string;
  /** 输入阶段说明 */
  inputsDetail: string;
  /** 比例尺类型阶段标题 */
  scaleTitle: string;
  /** 比例尺类型阶段说明 */
  scaleDetail: string;
  /** 值域解析阶段标题 */
  resolveTitle: string;
  /** 值域解析阶段说明 */
  resolveDetail: string;
  /** 映射结果阶段标题 */
  outputsTitle: string;
  /** 映射结果阶段说明 */
  outputsDetail: string;
  /** 类型派生关系标签 */
  derive: string;
  /** 契约校验关系标签 */
  validate: string;
  /** 坐标映射关系标签 */
  map: string;
};

/** 位置比例尺解析流程图属性 */
export type ScalePositionFlowProps = {
  /** 当前页面语言对应的可见文字 */
  labels: ScalePositionFlowLabels;
};

/** 位置比例尺从字段与图元语义到最终坐标和 guide 的解析链路 */
export const ScalePositionFlow: FC<ScalePositionFlowProps> = props => {
  const { labels } = props;

  return (
    <>
      <div className="hidden sm:block">
        <Layout width={780} height={160} style={{ maxWidth: '100%', height: 'auto' }}>
          <Node
            id="desktop-inputs"
            position={[-285, 0]}
            minimumSize={{ width: 150, height: 54 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.inputsTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.inputsDetail}
            </Text>
          </Node>
          <Node
            id="desktop-scale"
            position={[-95, 0]}
            minimumSize={{ width: 150, height: 54 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.scaleTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.scaleDetail}
            </Text>
          </Node>
          <Node
            id="desktop-resolve"
            position={[100, 0]}
            minimumSize={{ width: 160, height: 54 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.resolveTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.resolveDetail}
            </Text>
          </Node>
          <Node
            id="desktop-outputs"
            position={[300, 0]}
            minimumSize={{ width: 160, height: 54 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={16}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.outputsTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.outputsDetail}
            </Text>
          </Node>

          <Draw
            way={[
              'desktop-inputs',
              {
                label: {
                  text: labels.derive,
                  position: 'midway',
                  side: 'top',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              'desktop-scale',
            ]}
            arrow="->"
          />
          <Draw
            way={[
              'desktop-scale',
              {
                label: {
                  text: labels.validate,
                  position: 'midway',
                  side: 'top',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              'desktop-resolve',
            ]}
            arrow="->"
          />
          <Draw
            way={[
              'desktop-resolve',
              {
                label: {
                  text: labels.map,
                  position: 'midway',
                  side: 'top',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              'desktop-outputs',
            ]}
            arrow="->"
          />
        </Layout>
      </div>

      <div className="sm:hidden">
        <Layout width={360} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
          <Node
            id="mobile-inputs"
            position={[-95, -30]}
            minimumSize={{ width: 130, height: 40 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={14}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.inputsTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.inputsDetail}
            </Text>
          </Node>
          <Node
            id="mobile-scale"
            position={[95, -30]}
            minimumSize={{ width: 130, height: 40 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={14}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.scaleTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.scaleDetail}
            </Text>
          </Node>
          <Node
            id="mobile-resolve"
            position={[95, 30]}
            minimumSize={{ width: 140, height: 40 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={14}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.resolveTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.resolveDetail}
            </Text>
          </Node>
          <Node
            id="mobile-outputs"
            position={[-95, 30]}
            minimumSize={{ width: 140, height: 40 }}
            stroke="gray"
            fill="gray"
            fillOpacity={0.08}
            cornerRadius={4}
            align="middle"
            lineHeight={14}
          >
            <Text font={{ size: 14, weight: 'bold' }}>{labels.outputsTitle}</Text>
            <Text fill="gray" font={{ size: 12 }}>
              {labels.outputsDetail}
            </Text>
          </Node>

          <Draw
            way={[
              'mobile-inputs',
              {
                label: {
                  text: labels.derive,
                  position: 'midway',
                  side: 'top',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              'mobile-scale',
            ]}
            arrow="->"
          />
          <Draw
            way={[
              'mobile-scale',
              {
                label: {
                  text: labels.validate,
                  position: 'midway',
                  side: 'right',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              'mobile-resolve',
            ]}
            arrow="->"
          />
          <Draw
            way={[
              'mobile-resolve',
              {
                label: {
                  text: labels.map,
                  position: 'midway',
                  side: 'top',
                  sloped: false,
                  textColor: 'gray',
                  font: { size: 12 },
                },
              },
              'mobile-outputs',
            ]}
            arrow="->"
          />
        </Layout>
      </div>
    </>
  );
};
