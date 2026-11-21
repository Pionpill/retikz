import type { input } from 'zod';

import type { ScopeSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** ScopeSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof ScopeSchema>>> = [
  {
    id: 'G001',
    task: '空组 g 开启局部命名空间，绘制层级 -2，元数据保留 source 为 demo，只将主题模式切为暗色。',
    expected: {
      type: 'scope',
      children: [],
      id: 'g',
      localNamespace: true,
      zIndex: -2,
      meta: {
        source: 'demo',
      },
      theme: {
        mode: 'dark',
      },
    },
  },
  {
    id: 'G002',
    task: '空组布局原点设为 (2,3)，以组局部左上角 (-1,2) 的零宽、高 8 矩形裁剪。',
    expected: {
      type: 'scope',
      children: [],
      position: [2, 3],
      clip: {
        kind: 'rect',
        params: {
          x: -1,
          y: 2,
          width: 0,
          height: 8,
        },
      },
    },
  },
  {
    id: 'G003',
    task: '空组用已注册的 mask 裁剪，参数 rings 原样保留 [[1,2]]。',
    expected: {
      type: 'scope',
      children: [],
      clip: {
        kind: 'mask',
        params: {
          rings: [[1, 2]],
        },
      },
    },
  },
  {
    id: 'G004',
    task: '空组使用圆形边界，将组自身原点对齐到父坐标系中 A 的右锚点。',
    expected: {
      type: 'scope',
      children: [],
      boundingShape: 'circle',
      position: {
        kind: 'anchor',
        target: {
          id: 'A',
          anchor: 'right',
        },
        selfAnchor: 'origin',
      },
    },
  },
  {
    id: 'G005',
    task: '空组最后向右平移 5、向下 2，此前先绕自身原点顺时针转 30 度，使用有序局部变换。',
    expected: {
      type: 'scope',
      children: [],
      transforms: [
        {
          kind: 'translate',
          x: 5,
          y: 2,
        },
        {
          kind: 'rotate',
          degrees: 30,
          pivot: 'origin',
        },
      ],
    },
  },
  {
    id: 'G006',
    task: '空组阻断全部样式继承，再给后代共享透明度 0.6。',
    expected: {
      type: 'scope',
      children: [],
      defaults: {
        reset: true,
        style: {
          opacity: 0.6,
        },
      },
    },
  },
  {
    id: 'G007',
    task: '空组只阻断节点通道继承。后代节点默认圆形，已有节点标签默认主色 red；路径已有标签默认主色 blue，不创建标签。',
    expected: {
      type: 'scope',
      children: [],
      defaults: {
        reset: ['node'],
        node: {
          shape: 'circle',
          label: {
            color: 'red',
          },
        },
        path: {
          label: {
            color: 'blue',
          },
        },
      },
    },
  },
  {
    id: 'G008',
    task: '空组给后代路径设默认圆角 3、旋转 20 度、均匀缩放 2；已有箭头共用长度 9，起端宽 4，末端重叠四分之一。',
    expected: {
      type: 'scope',
      children: [],
      defaults: {
        path: {
          cornerRadius: 3,
          rotate: 20,
          scale: 2,
          arrow: {
            length: 9,
            start: {
              width: 4,
            },
            end: {
              endpointOverlap: 0.25,
            },
          },
        },
      },
    },
  },
  {
    id: 'G009',
    task: '空组先绕局部点 (1,2) 横向放大 3、纵向放大 2，随后以 A 为极点、90 度半径 8 平移。保留变换表达。',
    expected: {
      type: 'scope',
      children: [],
      transforms: [
        {
          kind: 'polar-translate',
          origin: 'A',
          angle: 90,
          radius: 8,
        },
        {
          kind: 'scale',
          x: 3,
          y: 2,
          pivot: [1, 2],
        },
      ],
    },
  },
  {
    id: 'G010',
    task: '空组通过局部变换平移到 A 右侧 10 个单位，保留方向表达，不改布局位置。',
    expected: {
      type: 'scope',
      children: [],
      transforms: [
        {
          kind: 'at-translate',
          of: 'A',
          direction: 'right',
          distance: 10,
        },
      ],
    },
  },
  {
    id: 'G011',
    task: '空组用基点偏移变换移到 A 本身，不另填位移。',
    expected: {
      type: 'scope',
      children: [],
      transforms: [
        {
          kind: 'offset-translate',
          of: 'A',
        },
      ],
    },
  },
  {
    id: 'G012',
    task: '空组用插值平移到 A 至 B 的四分之一处。',
    expected: {
      type: 'scope',
      children: [],
      transforms: [
        {
          kind: 'between-translate',
          between: [
            {
              id: 'A',
            },
            {
              id: 'B',
            },
          ],
          fraction: 0.25,
        },
      ],
    },
  },
  {
    id: 'G013',
    task: '把组下边从左到右的四分之一点对齐父坐标 (4,5)，保留锚点表达。',
    expected: {
      type: 'scope',
      children: [],
      position: {
        kind: 'anchor',
        target: [4, 5],
        selfAnchor: {
          side: 'bottom',
          fraction: 0.25,
        },
      },
    },
  },
  {
    id: 'G014',
    task: '作用域内放一个未设样式的节点和一条从原点连到 (1,1) 的路径，后代共享描边宽 2；仅路径默认宽 4，节点默认圆角 3。不要把默认值抄到子项。',
    expected: {
      type: 'scope',
      children: [
        {
          type: 'node',
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [1, 1] },
          ],
        },
      ],
      defaults: {
        style: {
          strokeWidth: 2,
        },
        path: {
          style: {
            strokeWidth: 4,
          },
        },
        node: {
          cornerRadius: 3,
        },
      },
    },
  },
  {
    id: 'G015',
    task: '组本身在 100 毫秒从完全透明变为不透明，不给子节点添加动画。',
    expected: {
      type: 'scope',
      children: [],
      animations: [
        {
          property: 'opacity',
          duration: 100,
          keyframes: [
            {
              at: 0,
              value: 0,
            },
            {
              at: 1,
              value: 1,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'G016',
    task: '组内路径已有标签默认按累计长度解释位置。组使用偏移平移，以 A 为基点右移 3、上移 4。保留变换表达，组内暂时为空。',
    expected: {
      type: 'scope',
      children: [],
      transforms: [
        {
          kind: 'offset-translate',
          of: 'A',
          offset: [3, -4],
        },
      ],
      defaults: {
        path: {
          label: {
            positionMode: 'length',
          },
        },
      },
    },
  },
  {
    id: 'G017',
    task: '作用域内只有 plot 域的 dots 组合对象，保留 values 为 [1,2]。本组切换主题名 paper，继承模式。',
    expected: {
      type: 'scope',
      theme: {
        name: 'paper',
      },
      children: [
        {
          type: 'dots',
          namespace: 'plot',
          values: [1, 2],
        },
      ],
    },
  },
  {
    id: 'G018',
    task: '空组只为后代设置默认描边宽 3。只影响节点。',
    expected: { type: 'scope', children: [], defaults: { node: { style: { strokeWidth: 3 } } } },
    contrastId: 'G019',
  },
  {
    id: 'G019',
    task: '空组只为后代设置默认描边宽 3。只影响路径。',
    expected: { type: 'scope', children: [], defaults: { path: { style: { strokeWidth: 3 } } } },
    contrastId: 'G018',
  },
  {
    id: 'G020',
    task: '父组已分别设置了节点和路径的默认样式。生成一个空子组，不声明任何新样式。只切断节点通道的继承。',
    expected: { type: 'scope', children: [], defaults: { reset: ['node'] } },
    contrastId: 'G021',
  },
  {
    id: 'G021',
    task: '父组已分别设置了节点和路径的默认样式。生成一个空子组，不声明任何新样式。一次切断所有默认样式通道的继承。',
    expected: { type: 'scope', children: [], defaults: { reset: true } },
    contrastId: 'G020',
  },
];
