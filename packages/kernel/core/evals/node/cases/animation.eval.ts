import type { IRNode } from '../../../src';
import type { NodeEvalCase } from '../suite';

/** 数值通道共用时序模板，保持独立的属性选择任务 */
const numericChannels = [
  {
    id: 'NI001',
    request: '主体整体不透明度从 0 到 1',
    property: 'opacity',
    from: 0,
    to: 1,
  },
  {
    id: 'NI002',
    request: '填充不透明度因子从 0.2 到 0.8',
    property: 'fillOpacity',
    from: 0.2,
    to: 0.8,
  },
  {
    id: 'NI003',
    request: '描边不透明度因子从 1 到 0',
    property: 'strokeOpacity',
    from: 1,
    to: 0,
  },
  {
    id: 'NI004',
    request: '描边画出进度从 0 到 1',
    property: 'pathDraw',
    from: 0,
    to: 1,
  },
  {
    id: 'NI005',
    request: '描边宽度从 0 到 4 个用户单位',
    property: 'strokeWidth',
    from: 0,
    to: 4,
  },
  {
    id: 'NI006',
    request: '描边虚线相位从负 4 到正 6 个用户单位',
    property: 'dashOffset',
    from: -4,
    to: 6,
  },
  {
    id: 'NI009',
    request: '水平平移动画值从 0 到 30 个用户单位',
    property: 'translateX',
    from: 0,
    to: 30,
  },
  {
    id: 'NI011',
    request: '旋转动画值从 0 到 90 度',
    property: 'rotate',
    from: 0,
    to: 90,
  },
  {
    id: 'NI012',
    request: '两个轴的统一缩放动画值从 1 到 2',
    property: 'scale',
    from: 1,
    to: 2,
  },
  {
    id: 'NI013',
    request: '水平方向缩放动画值从 1 到 3',
    property: 'scaleX',
    from: 1,
    to: 3,
  },
  {
    id: 'NI014',
    request: '垂直方向缩放动画值从 1 到 0.5',
    property: 'scaleY',
    from: 1,
    to: 0.5,
  },
] as const;

/** 颜色通道保持字符串关键帧 */
const colorChannels = [
  {
    id: 'NI007',
    request: '主体填充色从 red 到 blue',
    property: 'fill',
    from: 'red',
    to: 'blue',
  },
  {
    id: 'NI008',
    request: '主体描边色从 #000000 到 #ffffff',
    property: 'stroke',
    from: '#000000',
    to: '#ffffff',
  },
] as const;

/** 统一时序题干与省略要求，不合并独立语义任务 */
const createChannelCase = (
  id: string,
  request: string,
  track: NonNullable<IRNode['animations']>[number],
): NodeEvalCase => ({
  id,
  task: '给节点添加一条声明式动画：' + request + '，时长 1200 毫秒，仅设起止两帧，其余沿用默认。',
  expected: { type: 'node', animations: [track] },
  mustOmit: ['position', 'rotate', 'scale', 'style'],
});

/** 动画通道、时序组合与宿主边界 */
export const animationCases: Array<NodeEvalCase> = [
  ...numericChannels.map(({ id, request, property, from, to }) =>
    createChannelCase(id, request, {
      property,
      duration: 1200,
      keyframes: [
        { at: 0, value: from },
        { at: 1, value: to },
      ],
    }),
  ),
  ...colorChannels.map(({ id, request, property, from, to }) =>
    createChannelCase(id, request, {
      property,
      duration: 1200,
      keyframes: [
        { at: 0, value: from },
        { at: 1, value: to },
      ],
    }),
  ),
  {
    id: 'NI010',
    task: '给节点添加一条声明式动画：垂直平移动画值从 0 到负 20 个用户单位，时长 1200 毫秒，仅设起止两帧，其余沿用默认。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'translateY',
          duration: 1200,
          keyframes: [
            {
              at: 0,
              value: 0,
            },
            {
              at: 1,
              value: -20,
            },
          ],
        },
      ],
    },
    mustOmit: ['position', 'rotate', 'scale', 'style'],
    counterexample: {
      expected: {
        type: 'node',
        animations: [
          {
            property: 'translateY',
            duration: 1.2,
            keyframes: [
              {
                at: 0,
                value: 0,
              },
              {
                at: 1,
                value: -20,
              },
            ],
          },
        ],
      },
      reason: '把秒误作毫秒；时长仍是合法正数',
    },
  },
  {
    id: 'NI015',
    task: '主体不透明度动画一轮 2 秒，先延迟 0.5 秒；默认缓动为先加速后减速。按时间先后输出：0% 时为 0，50% 时为 0.8，100% 时为 1；从中间帧到最后一帧改用线性缓动。播放 3 轮，每轮交替反向，活动区间前后都填充值，进入可见区域触发。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'opacity',
          duration: 2000,
          delay: 500,
          easing: 'ease-in-out',
          iterations: 3,
          direction: 'alternate',
          fill: 'both',
          trigger: 'visible',
          keyframes: [
            {
              at: 0,
              value: 0,
            },
            {
              at: 0.5,
              value: 0.8,
              easing: 'linear',
            },
            {
              at: 1,
              value: 1,
            },
          ],
        },
      ],
    },
    counterexample: {
      expected: {
        type: 'node',
        animations: [
          {
            property: 'opacity',
            duration: 2000,
            delay: 500,
            easing: 'ease-in-out',
            iterations: 3,
            direction: 'alternate',
            fill: 'both',
            trigger: 'visible',
            keyframes: [
              {
                at: 0,
                value: 0,
              },
              {
                at: 0.5,
                value: 0.8,
              },
              {
                at: 1,
                value: 1,
                easing: 'linear',
              },
            ],
          },
        ],
      },
      reason: '将中间帧 easing 移到末帧，改变其所作用的时间段',
    },
  },
  {
    id: 'NI016',
    task: '节点水平移动动画的关键帧从 0 到 20，一轮 800 毫秒，无限循环；第一轮从末帧反向播放，第二轮正向播放，此后逐轮交替，活动区间之外不填充值；收到宿主事件 reveal 时开始。轨道默认缓动用三次贝塞尔 [0.2,-0.1,0.8,1.2]，首帧到下一帧改用 [0.1,0,0.9,1]。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'translateX',
          duration: 800,
          iterations: 'infinite',
          direction: 'alternate-reverse',
          fill: 'none',
          trigger: {
            onEvent: 'reveal',
          },
          easing: [0.2, -0.1, 0.8, 1.2],
          keyframes: [
            {
              at: 0,
              value: 0,
              easing: [0.1, 0, 0.9, 1],
            },
            {
              at: 1,
              value: 20,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'NI017',
    task: '节点统一缩放从 1 到 2，一轮 1000 毫秒；加载后开始，正向播放，结束后保留末值，以节点下方锚点为支点。请显式保留这些时序和支点配置。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'scale',
          duration: 1000,
          trigger: 'load',
          direction: 'normal',
          fill: 'forwards',
          origin: 'bottom',
          keyframes: [
            {
              at: 0,
              value: 1,
            },
            {
              at: 1,
              value: 2,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'NI018',
    task: '节点统一缩放从 1 到 2，一轮 1000 毫秒；手动触发，反向播放，开始前应用首值，以元素局部坐标 [3,-2] 为支点。请显式保留这些时序和支点配置。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'scale',
          duration: 1000,
          trigger: 'manual',
          direction: 'reverse',
          fill: 'backwards',
          origin: [3, -2],
          keyframes: [
            {
              at: 0,
              value: 1,
            },
            {
              at: 1,
              value: 2,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'NI019',
    task: '同时添加两条动画：不透明度在 500 毫秒内从 0 到 1，旋转在 1000 毫秒内从 0 到 180 度并以中心为支点；各轨道时长独立，不变成两个节点。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'opacity',
          duration: 500,
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
        {
          property: 'rotate',
          duration: 1000,
          origin: 'center',
          keyframes: [
            {
              at: 0,
              value: 0,
            },
            {
              at: 1,
              value: 180,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'NI020',
    task: '诊断题：为节点添加镜头视口动画，从 [0,0,100,80] 到 [10,20,50,40]，一轮 1000 毫秒。此题暂不进入模型计分，先审查节点与场景根的能力边界。',
    expected: {
      type: 'node',
      animations: [
        {
          property: 'viewBox',
          duration: 1000,
          keyframes: [
            {
              at: 0,
              value: [0, 0, 100, 80],
            },
            {
              at: 1,
              value: [10, 20, 50, 40],
            },
          ],
        },
      ],
    },
    diagnostic: 'NodeSchema 接受 viewBox，但消费契约仅允许 Scene 根使用镜头轨道',
  },
];
