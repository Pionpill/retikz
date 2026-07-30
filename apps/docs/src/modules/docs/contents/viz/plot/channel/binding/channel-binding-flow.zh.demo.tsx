import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 字符串通道从构建期判定到运行期取值的完整链路插图
 * @description 字符串扁平样式 prop 先匹配字段名，未命中才尝试合法常量，确定绑定类型后分别读取 canonical row 或固定值并交给通道消费方
 */
const Demo: FC = () => (
  <Layout width={620} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="input"
      position={[-225, -80]}
      minimumSize={{ width: 100, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>字符串 prop</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {'color="value"'}
      </Text>
    </Node>

    <Node
      id="field-candidate"
      position={[-90, -80]}
      minimumSize={{ width: 110, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>① 字段命中？</Text>
      <Text fill="gray" font={{ size: 12 }}>
        匹配数据模型
      </Text>
    </Node>

    <Node
      id="field-path"
      position={[58, -80]}
      minimumSize={{ width: 125, height: 60 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>字段 → 逐行值</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {"{ field: 'value' }"}
      </Text>
    </Node>

    <Node
      id="constant-candidate"
      position={[-90, 30]}
      minimumSize={{ width: 110, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>② 合法常量？</Text>
      <Text fill="gray" font={{ size: 12 }}>
        按 prop 校验
      </Text>
    </Node>

    <Node
      id="constant-path"
      position={[58, 30]}
      minimumSize={{ width: 125, height: 60 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>常量 → 固定值</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {"{ value: 'value' }"}
      </Text>
    </Node>

    <Node
      id="warning"
      position={[-90, 140]}
      minimumSize={{ width: 110, height: 60 }}
      stroke="red"
      fill="red"
      fillOpacity={0.05}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>③ 警告并跳过</Text>
      <Text fill="gray" font={{ size: 12 }}>
        不生成通道绑定
      </Text>
    </Node>

    <Node
      id="channel-consumer"
      position={[213, -25]}
      minimumSize={{ width: 125, height: 60 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>通道消费</Text>
      <Text fill="gray" font={{ size: 12 }}>
        位置 / 样式 / 文本
      </Text>
    </Node>

    <Draw way={['input', 'field-candidate']} arrow="->" stroke="gray" />
    <Draw way={['field-candidate', 'field-path']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'field-candidate',
        {
          label: {
            text: '未命中才继续',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'constant-candidate',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['constant-candidate', 'constant-path']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'constant-candidate',
        {
          label: {
            text: '不合法',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'warning',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['field-path', 'channel-consumer']} arrow="->" stroke="gray" />
    <Draw way={['constant-path', 'channel-consumer']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
