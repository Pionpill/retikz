import type { IRNode } from '../../../src';
import type { NodeEvalCase } from '../suite';

/** 填充覆盖资源分支；其他宿主保留位置辨析与实测易错组合 */
const paintResources: Array<{ request: string; paint: NonNullable<NonNullable<IRNode['style']>['fill']> }> = [
  {
    request: '起点红色且 40% 不透明、终点蓝色且保持默认不透明的线性渐变，角度 45 度',
    paint: {
      kind: 'linearGradient',
      stops: [
        {
          offset: 0,
          color: '#ff0000',
          opacity: 0.4,
        },
        {
          offset: 1,
          color: '#0000ff',
        },
      ],
      angle: 45,
    },
  },
  {
    request:
      '起点红色且 40% 不透明、终点蓝色且保持默认不透明的径向渐变；包围盒归一化中心为 [0.25,0.75]，半径为包围盒单位 0.4',
    paint: {
      kind: 'radialGradient',
      stops: [
        {
          offset: 0,
          color: '#ff0000',
          opacity: 0.4,
        },
        {
          offset: 1,
          color: '#0000ff',
        },
      ],
      center: [0.25, 0.75],
      radius: 0.4,
    },
  },
  {
    request: '起点红色且 40% 不透明、终点蓝色且保持默认不透明的锥形渐变；包围盒中心 [0.4,0.6]，起始角 30 度',
    paint: {
      kind: 'conicGradient',
      stops: [
        {
          offset: 0,
          color: '#ff0000',
          opacity: 0.4,
        },
        {
          offset: 1,
          color: '#0000ff',
        },
      ],
      center: [0.4, 0.6],
      angle: 30,
    },
  },
  {
    request: '颜色 #224466 的平行线图案，基础间距 12、线宽 2 个用户单位，整个图案旋转 30 度，底色保持透明',
    paint: {
      kind: 'pattern',
      shape: 'lines',
      color: '#224466',
      size: 12,
      lineWidth: 2,
      rotation: 30,
    },
  },
  {
    request: '图片 https://example.com/a.png，保持比例且完整显示，允许空白，不裁切也不拉伸',
    paint: {
      kind: 'image',
      href: 'https://example.com/a.png',
      fit: 'contain',
    },
  },
];

/** 资源的消费位置与稳定编号起点 */
const paintScopes = [
  {
    start: 1,
    indices: [0, 1, 2, 3, 4],
    scope: 'fill',
    request: '节点内部填充',
  },
  {
    start: 6,
    indices: [0, 3],
    scope: 'stroke',
    request: '节点轮廓描边',
  },
  {
    start: 11,
    indices: [0, 1, 3],
    scope: 'pin',
    request: '节点外侧标签 L 的引线描边',
  },
] as const;

/** 为每个消费位置建立独立参考输入 */
const createPaintNode = (
  scope: 'fill' | 'stroke' | 'pin',
  paint: NonNullable<NonNullable<IRNode['style']>['fill']>,
): IRNode =>
  scope === 'pin'
    ? { type: 'node', label: { text: 'L', placement: 'outside', pin: { stroke: paint } } }
    : { type: 'node', style: { [scope]: paint } };

/** 绘制资源、默认参数及其消费位置 */
export const paintCases: Array<NodeEvalCase> = [
  ...paintScopes.flatMap(({ start, scope, request, indices }) =>
    indices.map((index): NodeEvalCase => ({
      id: `NF${String(start + index).padStart(3, '0')}`,
      task: '仅设置' + request + '为' + paintResources[index].request + '，不要把资源施加到其他部位。',
      expected: createPaintNode(scope, structuredClone(paintResources[index].paint)),
    })),
  ),
  {
    id: 'NF016',
    task: '节点填充采用从红到蓝的径向渐变；中心、半径和色标不透明度都采用契约默认，不写这些可选值。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'radialGradient',
          stops: [
            {
              offset: 0,
              color: 'red',
            },
            {
              offset: 1,
              color: 'blue',
            },
          ],
        },
      },
    },
    mustOmit: ['style.fill.center', 'style.fill.radius', 'style.fill.stops.0.opacity', 'style.fill.stops.1.opacity'],
  },
  {
    id: 'NF017',
    task: '轮廓使用从 black 到 white 的线性渐变，角度由后端默认决定；不猜测具体方向。',
    expected: {
      type: 'node',
      style: {
        stroke: {
          kind: 'linearGradient',
          stops: [
            {
              offset: 0,
              color: 'black',
            },
            {
              offset: 1,
              color: 'white',
            },
          ],
        },
      },
    },
    mustOmit: ['style.stroke.angle'],
  },
  {
    id: 'NF018',
    task: '填充用 red 到 blue 的锥形渐变；采用默认中心和默认起始角，但不物化可选值。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'conicGradient',
          stops: [
            {
              offset: 0,
              color: 'red',
            },
            {
              offset: 1,
              color: 'blue',
            },
          ],
        },
      },
    },
    mustOmit: ['style.fill.center', 'style.fill.angle'],
  },
  {
    id: 'NF019',
    task: '填充使用网格，基础颜色 #222222、间距 10、底色 white。只对横线覆盖红色、宽 2、虚线开关 true、点线开关 true、显式 [4,2]、偏移 -1、圆头、圆角；只对竖线覆盖蓝色、宽 3、虚线开关 false、点线开关 true、偏移 2、方头、斜角。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'pattern',
          shape: 'grid',
          color: '#222222',
          size: 10,
          background: 'white',
          horizontalStyle: {
            color: 'red',
            lineWidth: 2,
            dashed: true,
            dotted: true,
            dashPattern: [4, 2],
            dashOffset: -1,
            lineCap: 'round',
            lineJoin: 'round',
          },
          verticalStyle: {
            color: 'blue',
            lineWidth: 3,
            dashed: false,
            dotted: true,
            dashOffset: 2,
            lineCap: 'square',
            lineJoin: 'bevel',
          },
        },
      },
    },
  },
  {
    id: 'NF020',
    task: '填充用平行线图案，black 线条、#eeeeee 底色、间距 16、线宽 2；虚线和点线开关都为 true，但显式序列 [6,2] 优先，相位 -3，方头、斜角；图案旋转 -15 度。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'pattern',
          shape: 'lines',
          color: 'black',
          background: '#eeeeee',
          size: 16,
          lineWidth: 2,
          dashed: true,
          dotted: true,
          dashPattern: [6, 2],
          dashOffset: -3,
          lineCap: 'square',
          lineJoin: 'bevel',
          rotation: -15,
        },
      },
    },
  },
  {
    id: 'NF021',
    task: '填充用平行线图案；相邻线每 4 根循环。按从 0 起算，只把第 0 槽覆盖为红色、宽 2、点线 true；第 2 槽覆盖为蓝色、宽 3、虚线 true、点线 true、序列 [3,1]、相位 -2、圆头、斜角。其余槽位保留基础样式，不展开完整列表。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'pattern',
          shape: 'lines',
          lineStyleCycle: {
            period: 4,
            overrides: [
              {
                index: 0,
                style: {
                  color: 'red',
                  lineWidth: 2,
                  dotted: true,
                },
              },
              {
                index: 2,
                style: {
                  color: 'blue',
                  lineWidth: 3,
                  dashed: true,
                  dotted: true,
                  dashPattern: [3, 1],
                  dashOffset: -2,
                  lineCap: 'round',
                  lineJoin: 'bevel',
                },
              },
            ],
          },
        },
      },
    },
  },
  {
    id: 'NF022',
    task: '填充用圆点图案，基础间距 15 个用户单位；圆点半径明确为 2，不能把它当直径。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'pattern',
          shape: 'dots',
          size: 15,
          lineWidth: 2,
        },
      },
    },
  },
  {
    id: 'NF023',
    task: '宿主已注册名称 zigzag 的图案，节点填充使用它；颜色、间距、线宽、底色和旋转均不覆盖，沿用提供者与契约默认。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'pattern',
          shape: 'zigzag',
        },
      },
    },
    mustOmit: [
      'style.fill.color',
      'style.fill.size',
      'style.fill.lineWidth',
      'style.fill.background',
      'style.fill.rotation',
    ],
  },
  {
    id: 'NF024',
    task: '节点填充使用 https://example.com/photo.png，图片不保持比例，直接拉伸铺满。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'image',
          href: 'https://example.com/photo.png',
          fit: 'fill',
        },
      },
    },
  },
  {
    id: 'NF025',
    task: '节点填充使用 https://example.com/photo.png，图片保持比例覆盖整个区域，允许裁切。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'image',
          href: 'https://example.com/photo.png',
          fit: 'cover',
        },
      },
    },
  },
  {
    id: 'NF026',
    task: '填充直接使用数据地址 data:image/png;base64,AA==，图片适配方式沿用默认，不显式设置。',
    expected: {
      type: 'node',
      style: {
        fill: {
          kind: 'image',
          href: 'data:image/png;base64,AA==',
        },
      },
    },
    mustOmit: ['style.fill.fit'],
  },
];
