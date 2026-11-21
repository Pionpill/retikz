import type { NodeEvalCase } from '../suite';

/** 标签 */
export const labelCases: Array<NodeEvalCase> = [
  {
    id: 'NH001',
    task: '给节点添加一条额外标签“注释”；标签的位置、距离、旋转、字体和对齐都使用宿主及契约默认，不显式指定。',
    expected: {
      type: 'node',
      label: {
        text: '注释',
      },
    },
    mustOmit: ['text', 'label.position', 'label.distance', 'label.rotate', 'label.font', 'label.align'],
  },
  {
    id: 'NH002',
    task: '添加两条额外标签：上方“入口”，下方“出口”；都位于外侧，分别离边框 6 和 9 个用户单位。',
    expected: {
      type: 'node',
      label: [
        {
          text: '入口',
          position: 'top',
          placement: 'outside',
          distance: 6,
        },
        {
          text: '出口',
          position: 'bottom',
          placement: 'outside',
          distance: 9,
        },
      ],
    },
  },
  {
    id: 'NH003',
    task: '从矩形节点右边的顶端往下量四分之一处放标签“Q”，标签在外侧、距旋转后的标签视觉框最近间隙为 7 个用户单位；保留边上比例表达。',
    expected: {
      type: 'node',
      shape: 'rectangle',
      label: {
        text: 'Q',
        position: {
          side: 'right',
          fraction: 0.25,
        },
        distance: 7,
      },
    },
  },
  {
    id: 'NH004',
    task: '标签“M”附着在矩形节点下边正中间，使用边界对象表达；比例使用默认，不显式填入。',
    expected: {
      type: 'node',
      label: {
        text: 'M',
        position: {
          side: 'bottom',
        },
      },
    },
    mustOmit: ['label.position.fraction'],
  },
  {
    id: 'NH005',
    task: '添加标签“L”，附着在节点朝 45 度的边界方向，文字沿径向旋转，并开启自动翻正；不要旋转节点。',
    expected: {
      type: 'node',
      label: {
        text: 'L',
        position: 45,
        rotate: 'radial',
        keepUpright: true,
      },
    },
    mustOmit: ['rotate'],
  },
  {
    id: 'NH006',
    task: '添加标签“L”，附着在节点左边，文字沿边界切线方向旋转，并开启自动翻正；不要旋转节点。',
    expected: {
      type: 'node',
      label: {
        text: 'L',
        position: 'left',
        rotate: 'tangent',
        keepUpright: true,
      },
    },
    mustOmit: ['rotate'],
  },
  {
    id: 'NH007',
    task: '添加标签“L”，附着在节点中心，文字不旋转，并开启自动翻正；不要旋转节点。',
    expected: {
      type: 'node',
      label: {
        text: 'L',
        position: 'center',
        rotate: 'none',
        keepUpright: true,
      },
    },
    mustOmit: ['rotate'],
  },
  {
    id: 'NH008',
    task: '添加标签“L”，附着在节点右上方，文字自身旋转负 20 度，并开启自动翻正；不要旋转节点。',
    expected: {
      type: 'node',
      label: {
        text: 'L',
        position: 'top-right',
        rotate: -20,
        keepUpright: true,
      },
    },
    mustOmit: ['rotate'],
  },
  {
    id: 'NH009',
    task: '标签“In”放在节点左侧边界内侧，间隙为 0；不要画引线。',
    expected: {
      type: 'node',
      label: {
        text: 'In',
        position: 'left',
        placement: 'inside',
        distance: 0,
      },
    },
  },
  {
    id: 'NH010',
    task: '节点右侧外边添加标签“说明”，开启使用默认样式的引线，不自定义引线颜色或线宽。',
    expected: {
      type: 'node',
      label: {
        text: '说明',
        position: 'right',
        pin: true,
      },
    },
  },
  {
    id: 'NH011',
    task: '节点整体不透明度 50%，右侧外标签“L”自身不透明度因子 60%；引线显式用 red、宽 2、圆头、斜角、线段 [4,2]、相位 -1，自己的不透明度因子为 80%。',
    expected: {
      type: 'node',
      style: {
        opacity: 0.5,
      },
      label: {
        text: 'L',
        position: 'right',
        opacity: 0.6,
        pin: {
          stroke: 'red',
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'bevel',
          dashPattern: [4, 2],
          dashOffset: -1,
          opacity: 0.8,
        },
      },
    },
  },
  {
    id: 'NH012',
    task: '节点整体不透明度为 50%，右侧外标签“L”的不透明度因子为 60%。画一条引线，让它沿用标签的有效不透明度，不单设引线样式。标签字体只改字重为 bold。',
    expected: {
      type: 'node',
      style: {
        opacity: 0.5,
      },
      label: {
        text: 'L',
        position: 'right',
        opacity: 0.6,
        font: {
          weight: 'bold',
        },
        pin: true,
      },
    },
    mustOmit: ['label.pin.opacity', 'label.font.family', 'label.font.size'],
  },
  {
    id: 'NH013',
    task: '给节点加一个标签，分两行写“甲”和“乙”。标签内的文字右对齐，行高 18，自动折行上限 60；标签框沿附着切线采用 start 对齐。标签文字用 #123456、70% 不透明度、等宽字体、字号 1rem、数值字重 600、斜体。',
    expected: {
      type: 'node',
      label: {
        text: ['甲', '乙'],
        textAlign: 'end',
        lineHeight: 18,
        maxTextWidth: 60,
        align: 'start',
        textColor: '#123456',
        opacity: 0.7,
        font: {
          family: 'monospace',
          size: '1rem',
          weight: 600,
          style: 'italic',
        },
      },
    },
    counterexample: {
      expected: {
        type: 'node',
        label: {
          text: ['甲', '乙'],
          textAlign: 'start',
          lineHeight: 18,
          maxTextWidth: 60,
          align: 'end',
          textColor: '#123456',
          opacity: 0.7,
          font: {
            family: 'monospace',
            size: '1rem',
            weight: 600,
            style: 'italic',
          },
        },
      },
      reason: '把 label.textAlign 与 label.align 的值互换；二者取值均合法但作用对象错误',
    },
  },
  {
    id: 'NH014',
    task: '节点主色 #336699，正文颜色 red；额外标签“W”的颜色使用标签有效主色的 0.3 权重，不改变标签透明度。',
    expected: {
      type: 'node',
      style: {
        color: '#336699',
        textColor: 'red',
      },
      label: {
        text: 'W',
        textColor: 0.3,
      },
    },
    mustOmit: ['label.opacity'],
  },
  {
    id: 'NH015',
    task: '节点正文“主体”；额外标签包含两行：第一行“标题”，第二行按顺序混排文本“v=”和公式 v；整条标签字体 serif、字号 16，第二行只改为字号 18、颜色权重 0.4、80% 不透明度；公式明确用展示式度量、字号 sm、#ff0000、60% 不透明度。宿主已注入公式能力。',
    expected: {
      type: 'node',
      text: '主体',
      label: {
        font: {
          family: 'serif',
          size: 16,
        },
        text: [
          '标题',
          {
            fill: 0.4,
            opacity: 0.8,
            font: {
              size: 18,
            },
            segments: [
              {
                text: 'v=',
              },
              {
                tex: 'v',
                displayMode: true,
                fontSize: 'sm',
                fill: '#ff0000',
                opacity: 0.6,
              },
            ],
          },
        ],
      },
    },
  },
  {
    id: 'NH016',
    task: '标签只有一条混排行，文字主色 #336699；文本段“t”只覆盖为颜色权重 0.4、70% 不透明度、等宽字体 bold；后接行内公式 x，继承行字号。外侧引线颜色采用标签有效文字主色的 0.6 权重，不能改变引线不透明度。宿主已注入公式能力。',
    expected: {
      type: 'node',
      label: {
        textColor: '#336699',
        text: [
          {
            segments: [
              {
                text: 't',
                fill: 0.4,
                opacity: 0.7,
                font: {
                  family: 'monospace',
                  weight: 'bold',
                },
              },
              {
                tex: 'x',
              },
            ],
          },
        ],
        pin: {
          stroke: 0.6,
        },
      },
    },
    mustOmit: ['label.pin.opacity', 'label.text.0.segments.1.fontSize'],
  },
  {
    id: 'NH017',
    task: '额外标签两行：第一行“普通”；第二行“突出”，用 blue、50% 不透明度，字体 Inter、18、bold、oblique；节点正文和主体样式不变。',
    expected: {
      type: 'node',
      label: {
        text: [
          '普通',
          {
            text: '突出',
            fill: 'blue',
            opacity: 0.5,
            font: {
              family: 'Inter',
              size: 18,
              weight: 'bold',
              style: 'oblique',
            },
          },
        ],
      },
    },
  },
];
