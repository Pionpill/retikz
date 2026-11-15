import type { NodeEvalCase } from '../suite';

/** 身份与结构 */
export const identityCases: Array<NodeEvalCase> = [
  {
    id: 'NA001',
    task: '创建一个使用默认外形和默认局部位置的节点，不添加文字或其他设置。',
    expected: {
      type: 'node',
    },
    mustOmit: ['id', 'text', 'children'],
  },
  {
    id: 'NA002',
    task: '创建主标识为 source 的节点；让 upstream、origin 这两个引用名也指向同一个节点，不能复制节点。',
    expected: {
      type: 'node',
      id: 'source',
      aliasIds: ['upstream', 'origin'],
    },
  },
  {
    id: 'NA003',
    task: '给节点保留业务附加信息：recordId 为 r7，enabled 为 true，score 为 0，extra 为 null，tags 为 ["a",2]，payload 为 {"nested":{"v":false}}。这些内容不应变成绘制属性。',
    expected: {
      type: 'node',
      meta: {
        recordId: 'r7',
        enabled: true,
        score: 0,
        extra: null,
        tags: ['a', 2],
        payload: {
          nested: {
            v: false,
          },
        },
      },
    },
    mustOmit: ['id', 'style'],
  },
  {
    id: 'NA004',
    task: '创建一个圆形节点，不指定其他样式。',
    expected: {
      type: 'node',
      shape: 'circle',
    },
  },
  {
    id: 'NA005',
    task: '创建一个椭圆形节点，不指定其他样式。',
    expected: {
      type: 'node',
      shape: 'ellipse',
    },
  },
  {
    id: 'NA006',
    task: '创建一个菱形节点，不指定其他样式。',
    expected: {
      type: 'node',
      shape: 'diamond',
    },
  },
  {
    id: 'NA007',
    task: '创建一个多边形节点，不指定其他样式。',
    expected: {
      type: 'node',
      shape: 'polygon',
    },
  },
  {
    id: 'NA008',
    task: '宿主已经注册名为 ticket 的节点外形；使用它，并将宿主提供的参数对象 {"notch":3,"flags":[true,null],"details":{"mode":"stub"}} 原样交给外形，不推断参数的几何含义。',
    expected: {
      type: 'node',
      shape: {
        type: 'ticket',
        params: {
          notch: 3,
          flags: [true, null],
          details: {
            mode: 'stub',
          },
        },
      },
    },
    mustOmit: ['style'],
  },
  {
    id: 'NA009',
    task: '节点画成菱形，但连接线与它相接时统一按圆形连接表面处理；不要改变实际显示外形。',
    expected: {
      type: 'node',
      shape: 'diamond',
      boundary: 'circle',
    },
  },
  {
    id: 'NA010',
    task: '节点使用已注册的 ticket 外形，并显式要求连接表面跟随这个视觉外形。',
    expected: {
      type: 'node',
      shape: 'ticket',
      boundary: 'shape',
    },
  },
  {
    id: 'NA011',
    task: '使用矩形视觉外形；宿主已注册名为 portRing 的连接边界，给它原样传入参数 {"gap":2}。',
    expected: {
      type: 'node',
      shape: 'rectangle',
      boundary: {
        type: 'portRing',
        params: {
          gap: 2,
        },
      },
    },
  },
];
