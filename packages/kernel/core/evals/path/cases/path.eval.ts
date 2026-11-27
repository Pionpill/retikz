import type { input } from 'zod';

import type { PathSchema } from '../../../src/schemas';
import type { CoreEvalCase } from '../../create-suite';

/** PathSchema 的完整输入任务与独立参考答案 */
export const cases: Array<CoreEvalCase<input<typeof PathSchema>>> = [
  {
    id: 'P001',
    task: '自定义路径提供者 wave，选项 waves 为 2，不写内置步骤。',
    expected: {
      type: 'path',
      kind: 'wave',
      kindOptions: {
        waves: 2,
      },
    },
  },
  {
    id: 'P002',
    task: '先将光标移到原点，再不画线地移到 (2,3)，最后画直线到 A 右锚点上方 2 个单位。保留两次移动。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'move',
          to: [2, 3],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            id: 'A',
            anchor: 'right',
            offset: [0, -2],
          },
        },
      ],
    },
  },
  {
    id: 'P003',
    task: '从原点依次画三段相对直线：右移 5 不更新基准，下移 2 并更新基准，再左移 1 不更新基准。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            relative: [5, 0],
          },
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            relativeAccumulate: [0, 2],
          },
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            relative: [-1, 0],
          },
        },
      ],
    },
  },
  {
    id: 'P004',
    task: '从原点水平投影到 A，再沿先竖后横的折线到 (3,4)，最后闭合。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'axis-line',
          axis: 'horizontal',
          to: {
            id: 'A',
          },
        },
        {
          type: 'step',
          kind: 'fold',
          via: '|-',
          to: [3, 4],
        },
        {
          type: 'step',
          kind: 'cycle',
        },
      ],
    },
  },
  {
    id: 'P005',
    task: '从原点用横竖横三段折线到 (8,4)，中间竖段放在水平距离四分之一处。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'fold',
          via: '-|-',
          fraction: 0.25,
          to: [8, 4],
        },
      ],
    },
  },
  {
    id: 'P006',
    task: '从原点经控制点 (1,2) 画二次曲线到 (3,4)，再用 (5,6)、(7,8) 依次作控制点画三次曲线到 (9,10)。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'curve',
          control: [1, 2],
          to: [3, 4],
        },
        {
          type: 'step',
          kind: 'cubic',
          control1: [5, 6],
          control2: [7, 8],
          to: [9, 10],
        },
      ],
    },
  },
  {
    id: 'P007',
    task: '从原点用右弯 25 度、松紧度 2 的弯线到 A，再用出角 10、入角 40 的弯线到 B。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'bend',
          to: {
            id: 'A',
          },
          bendDirection: 'right',
          bendAngle: 25,
          looseness: 2,
        },
        {
          type: 'step',
          kind: 'bend',
          to: {
            id: 'B',
          },
          outAngle: 10,
          inAngle: 40,
        },
      ],
    },
  },
  {
    id: 'P008',
    task: '从原点连续绘制两个弧步骤，中间不移动或另起子路径。先以当前光标为圆心画半径 3 的 0 到 90 度圆弧；再以 A 为中心画横半径 4、纵半径 2 的 90 到 0 度椭圆弧。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'arc',
          startAngle: 0,
          endAngle: 90,
          radius: 3,
        },
        {
          type: 'step',
          kind: 'arc',
          startAngle: 90,
          endAngle: 0,
          radius: {
            x: 4,
            y: 2,
          },
          center: {
            id: 'A',
          },
        },
      ],
    },
  },
  {
    id: 'P009',
    task: '从原点绘制半径 4、0 到 60 度的圆扇形，随后直接以扇形结束时的笔位为中心绘制横纵半径 4 和 2、0 到 90 度的开放椭圆段，中间不插入移动步骤。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'circlePath',
          radius: 4,
          startAngle: 0,
          endAngle: 60,
          closed: 'sector',
        },
        {
          type: 'step',
          kind: 'ellipsePath',
          radius: {
            x: 4,
            y: 2,
          },
          startAngle: 0,
          endAngle: 90,
          closed: 'open',
        },
      ],
    },
  },
  {
    id: 'P010',
    task: '从原点开始，加一个以 (1,2)、(8,9) 为对角的矩形，圆角 0；再用张力 2 的平滑曲线依次穿过 A 和 B。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'rectangle',
          from: [1, 2],
          to: [8, 9],
          cornerRadius: 0,
        },
        {
          type: 'step',
          kind: 'smooth',
          points: [
            {
              id: 'A',
            },
            {
              id: 'B',
            },
          ],
          tension: 2,
        },
      ],
    },
  },
  {
    id: 'P011',
    task: '从原点直线到 (4,0)，仅在此段的终点附单个标签 E，再直线到 (8,0)。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: [4, 0],
          label: {
            text: 'E',
            position: 'at-end',
          },
        },
        {
          type: 'step',
          kind: 'line',
          to: [8, 0],
        },
      ],
    },
  },
  {
    id: 'P012',
    task: '路径从原点直线到 (8,0)。整条路径圆角 2，旋转 15 度，横纵缩放 2、3；填充规则用奇偶。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: [8, 0],
        },
      ],
      cornerRadius: 2,
      rotate: 15,
      scale: {
        x: 2,
        y: 3,
      },
      style: {
        fillRule: 'evenodd',
      },
    },
  },
  {
    id: 'P013',
    task: '从原点连到 A。起点空心圆箭头长 4，终点 stealth 箭头宽 3、端点重叠一半；不要中途标记。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            id: 'A',
          },
        },
      ],
      arrow: {
        start: {
          shape: 'openCircle',
          length: 4,
        },
        end: {
          shape: 'stealth',
          width: 3,
          endpointOverlap: 0.5,
        },
      },
    },
  },
  {
    id: 'P014',
    task: '从原点连到 A。在圆角前按段计的四分之一处放已注册标记 tick，固定旋转 15 度、缩放 2，参数 n 为 3。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            id: 'A',
          },
        },
      ],
      marks: [
        {
          shape: 'tick',
          pos: 0.25,
          positionMode: 'step',
          positionGeometry: 'original',
          rotate: 15,
          scale: 2,
          params: {
            n: 3,
          },
        },
      ],
    },
  },
  {
    id: 'P015',
    task: '从原点连到 A。沿整条路径放两个标签：L 在圆角后按长度 30% 处，沿切线旋转、居中并断线，每侧留 2；R 用终点关键字定位，在下方距离 4，不覆盖其度量方式。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            id: 'A',
          },
        },
      ],
      label: [
        {
          text: 'L',
          position: 0.3,
          positionGeometry: 'rounded',
          positionMode: 'length',
          side: 'center',
          sloped: true,
          interrupt: true,
          gap: 2,
        },
        {
          text: 'R',
          position: 'at-end',
          side: 'bottom',
          distance: 4,
        },
      ],
    },
  },
  {
    id: 'P016',
    task: '建立名为 wire 的从原点连到 (1,1) 的路径，层级 -1，元数据 debug 为 false。其整体透明度 0.8、填充因子 0.3、描边因子 0.6。',
    expected: {
      type: 'path',
      id: 'wire',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [1, 1] },
      ],
      zIndex: -1,
      meta: {
        debug: false,
      },
      style: {
        opacity: {
          overall: 0.8,
          fill: 0.3,
          stroke: 0.6,
        },
      },
    },
  },
  {
    id: 'P017',
    task: '从原点画到 A 的 45 度锚点，连接面改为圆形，再连向 B 右边自上而下四分之一处。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            id: 'A',
            anchor: 45,
            boundary: 'circle',
          },
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            id: 'B',
            anchor: {
              side: 'right',
              fraction: 0.25,
            },
          },
        },
      ],
    },
  },
  {
    id: 'P018',
    task: '从原点连到 (1,1) 的路径有一个自定义末端箭头 needle：主色 red、填充 blue、描边 black、轮廓宽 2、虚线序列 [3,1] 偏移 1、圆端帽斜角连接，箭头透明度 0.7；参数 tip 为 4。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [1, 1] },
      ],
      arrow: {
        end: {
          shape: 'needle',
          color: 'red',
          fill: 'blue',
          stroke: 'black',
          lineWidth: 2,
          dashPattern: [3, 1],
          dashOffset: 1,
          lineCap: 'round',
          lineJoin: 'bevel',
          opacity: 0.7,
          params: {
            tip: 4,
          },
        },
      },
    },
  },
  {
    id: 'P019',
    task: '从原点连到 (1,1) 的路径的主体设均匀缩放 2，标签用单对象写两行 A 和 B 的换行字符串，标签文本右对齐、行高 12、折行宽 40，文字用 red、字号 10、透明度一半。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [1, 1] },
      ],
      scale: 2,
      label: {
        text: 'A\nB',
        textAlign: 'end',
        lineHeight: 12,
        maxTextWidth: 40,
        textColor: 'red',
        font: {
          size: 10,
        },
        opacity: 0.5,
      },
    },
  },
  {
    id: 'P020',
    task: '从原点开始，水平投影到坐标 (5,8)。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'axis-line',
          axis: 'horizontal',
          to: [5, 8],
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P021',
    task: '从原点开始，先横后竖折到 A。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'fold',
          via: '-|',
          to: {
            id: 'A',
          },
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P022',
    task: '从原点开始，以竖横竖三段在高度的一半处折到 A，不写默认分割比例。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'fold',
          via: '|-|',
          to: {
            id: 'A',
          },
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P023',
    task: '从原点开始，经控制点 (3,2) 画二次曲线到 A。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'curve',
          control: [3, 2],
          to: {
            id: 'A',
          },
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P024',
    task: '从原点开始，经 (1,2)、(3,4) 两个控制点画三次曲线到 A。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'cubic',
          control1: [1, 2],
          control2: [3, 4],
          to: {
            id: 'A',
          },
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P025',
    task: '从原点开始，用右弯曲线到 A。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'bend',
          bendDirection: 'right',
          to: {
            id: 'A',
          },
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P026',
    task: '从原点开始，以当前光标为圆心画半径 5、0 至 80 度的圆弧，笔停在弧末，不另建圆形子路径。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'arc',
          radius: 5,
          startAngle: 0,
          endAngle: 80,
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P027',
    task: '从原点开始，以当前光标为中心画完整半径 5 的圆形子路径。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'circlePath',
          radius: 5,
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P028',
    task: '从原点开始，以当前光标为中心画完整横半径 5、纵半径 3 的椭圆子路径。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'ellipsePath',
          radius: {
            x: 5,
            y: 3,
          },
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P029',
    task: '从原点开始，画依次穿过 A、B 的平滑曲线。只在这个绘制步骤的末端添加文字 L（使用终点关键字），不要给整条路径加标签。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'smooth',
          points: [
            {
              id: 'A',
            },
            {
              id: 'B',
            },
          ],
          label: {
            text: 'L',
            position: 'at-end',
          },
        },
      ],
    },
  },
  {
    id: 'P030',
    task: '显式选择 stroke。从原点画直线到 A 至 B 的四分之一处，保留插值。在整条路径的一半处放 plus 标记，并显式指定随切线自动旋转。',
    expected: {
      type: 'path',
      kind: 'stroke',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: {
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
        },
      ],
      marks: [
        {
          shape: 'plus',
          pos: 0.5,
          rotate: 'auto',
        },
      ],
    },
  },
  {
    id: 'P031',
    task: '从以 A 为极点、45 度半径 8 的位置开始，直线连到从 B 向左 2、向下 3 的位置，两端都保留构造方式。只在这条直线段上添加两行标签，第一行 L 透明度一半，第二行用纯字符串 R。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: {
            origin: 'A',
            angle: 45,
            radius: 8,
          },
        },
        {
          type: 'step',
          kind: 'line',
          to: {
            of: 'B',
            offset: [-2, 3],
          },
          label: {
            text: [
              {
                text: 'L',
                opacity: 0.5,
              },
              'R',
            ],
          },
        },
      ],
    },
  },
  {
    id: 'P032',
    task: '从原点直线到 (8,5)，主体使用非零环绕填充、平端帽、圆角连接。只在终点加内置 open 空心箭头，箭头轮廓宽 2，不改主体线宽。',
    expected: {
      type: 'path',
      children: [
        {
          type: 'step',
          kind: 'move',
          to: [0, 0],
        },
        {
          type: 'step',
          kind: 'line',
          to: [8, 5],
        },
      ],
      style: {
        fillRule: 'nonzero',
        lineCap: 'butt',
        lineJoin: 'round',
      },
      arrow: {
        end: {
          shape: 'open',
          lineWidth: 2,
        },
      },
    },
  },
  {
    id: 'P033',
    task: '从原点画直线到 (2,0)，再到 (2,8)，在整条路径的 30% 放文字 L。比例使用数值，显式保留采样方式。每个绘制步骤占相同比例。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [2, 0] },
        { type: 'step', kind: 'line', to: [2, 8] },
      ],
      label: { text: 'L', position: 0.3, positionMode: 'step' },
    },
    contrastId: 'P034',
  },
  {
    id: 'P034',
    task: '从原点画直线到 (2,0)，再到 (2,8)，在整条路径的 30% 放文字 L。比例使用数值，显式保留采样方式。按累计长度计算。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [2, 0] },
        { type: 'step', kind: 'line', to: [2, 8] },
      ],
      label: { text: 'L', position: 0.3, positionMode: 'length' },
    },
    contrastId: 'P033',
  },
  {
    id: 'P035',
    task: '从原点依次直线到 (10,0)、(10,20)，拐角半径 4。整条路径放一个标签 L，明确按累计长度在 40% 处采样。定位时使用圆角处理前的折线。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'line', to: [10, 20] },
      ],
      cornerRadius: 4,
      label: { text: 'L', position: 0.4, positionMode: 'length', positionGeometry: 'original' },
    },
    contrastId: 'P036',
  },
  {
    id: 'P036',
    task: '从原点依次直线到 (10,0)、(10,20)，拐角半径 4。整条路径放一个标签 L，明确按累计长度在 40% 处采样。定位时使用圆角处理后的路径。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'line', to: [10, 20] },
      ],
      cornerRadius: 4,
      label: { text: 'L', position: 0.4, positionMode: 'length', positionGeometry: 'rounded' },
    },
    contrastId: 'P035',
  },
  {
    id: 'P037',
    contrastId: 'P038',
    task: '从 (1,2) 开始，用一个含两段的正交折线步骤连到 (9,7)。先水平走，再竖直走。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'fold', via: '-|', to: [9, 7] },
      ],
    },
  },
  {
    id: 'P038',
    contrastId: 'P037',
    task: '从 (1,2) 开始，用一个含两段的正交折线步骤连到 (9,7)。先竖直走，再水平走。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'fold', via: '|-', to: [9, 7] },
      ],
    },
  },
  {
    id: 'P039',
    contrastId: 'P040',
    task: '从 (1,2) 开始，把目标 (9,7) 投影到经过当前点的局部轴，只画一条直线，保留目标与投影方式。线段保持水平。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'axis-line', axis: 'horizontal', to: [9, 7] },
      ],
    },
  },
  {
    id: 'P040',
    contrastId: 'P039',
    task: '从 (1,2) 开始，把目标 (9,7) 投影到经过当前点的局部轴，只画一条直线，保留目标与投影方式。线段保持竖直。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'axis-line', axis: 'vertical', to: [9, 7] },
      ],
    },
  },
  {
    id: 'P041',
    contrastId: 'P042',
    task: '以 (1,2) 为中心，用半径 6 的圆形子路径画从 0 到 90 度的部分圆。显式指定闭合方式。用一条弦连接两个弧端点。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'circlePath', radius: 6, startAngle: 0, endAngle: 90, closed: 'chord' },
      ],
    },
  },
  {
    id: 'P042',
    contrastId: 'P041',
    task: '以 (1,2) 为中心，用半径 6 的圆形子路径画从 0 到 90 度的部分圆。显式指定闭合方式。将弧端点连接到圆心，形成扇形。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'circlePath', radius: 6, startAngle: 0, endAngle: 90, closed: 'sector' },
      ],
    },
  },
  {
    id: 'P043',
    contrastId: 'P044',
    task: '从 (1,2) 出发，画直线至相对基点右方 6 个单位，再画到相对基点下方 4 个单位。保留相对表达；第二次位移不更新基点。第一次位移也不更新基点。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'line', to: { relative: [6, 0] } },
        { type: 'step', kind: 'line', to: { relative: [0, 4] } },
      ],
    },
  },
  {
    id: 'P044',
    contrastId: 'P043',
    task: '从 (1,2) 出发，画直线至相对基点右方 6 个单位，再画到相对基点下方 4 个单位。保留相对表达；第二次位移不更新基点。第一次位移的结果成为第二次的基点。',
    expected: {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [1, 2] },
        { type: 'step', kind: 'line', to: { relativeAccumulate: [6, 0] } },
        { type: 'step', kind: 'line', to: { relative: [0, 4] } },
      ],
    },
  },
];
