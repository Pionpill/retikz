import type { NodeEvalCase } from '../suite';

/** 文本与字体 */
export const textCases: Array<NodeEvalCase> = [
  {
    id: 'ND001',
    task: '节点正文为“第一行”换行后“第二行”，换行是强制断行；不设置自动折行宽度。',
    expected: {
      type: 'node',
      text: '第一行\n第二行',
    },
    mustOmit: ['layout.maxTextWidth'],
  },
  {
    id: 'ND002',
    task: '正文依次为普通行“标题”和一行“强调”；只有第二行用 #cc0000、60% 不透明度、加粗，其他字体设置沿用正文。',
    expected: {
      type: 'node',
      text: [
        '标题',
        {
          text: '强调',
          fill: '#cc0000',
          opacity: 0.6,
          font: {
            weight: 'bold',
          },
        },
      ],
    },
    mustOmit: ['style.fill', 'text.1.font.family', 'text.1.font.size'],
  },
  {
    id: 'ND003',
    task: '节点正文主色为 #336699，字体为 Inter、16 个用户单位、常规字重。两行正文：第一行“普通”；第二行“淡色”，颜色使用正文有效文字色的 0.4 权重，字体只覆盖为 20 个用户单位、数值字重 600、斜体。不要把权重当透明度。',
    expected: {
      type: 'node',
      style: {
        textColor: '#336699',
        font: {
          family: 'Inter',
          size: 16,
          weight: 'normal',
        },
      },
      text: [
        '普通',
        {
          text: '淡色',
          fill: 0.4,
          font: {
            size: 20,
            weight: 600,
            style: 'italic',
          },
        },
      ],
    },
    mustOmit: ['text.1.opacity', 'text.1.font.family'],
  },
  {
    id: 'ND004',
    task: '正文只有一行，按顺序混排文字“x = ”、行内公式 x^2、文字“ + 1”。整行使用 #223344、80% 不透明度、字号 18；第一文字段只改为颜色权重 0.5、70% 不透明度、等宽字体；公式用 #cc0000、60% 不透明度、字号 24；末段继承。宿主已注入公式能力。',
    expected: {
      type: 'node',
      text: [
        {
          fill: '#223344',
          opacity: 0.8,
          font: {
            size: 18,
          },
          segments: [
            {
              text: 'x = ',
              fill: 0.5,
              opacity: 0.7,
              font: {
                family: 'monospace',
              },
            },
            {
              tex: 'x^2',
              fontSize: 24,
              fill: '#cc0000',
              opacity: 0.6,
              displayMode: false,
            },
            {
              text: ' + 1',
            },
          ],
        },
      ],
    },
  },
  {
    id: 'ND005',
    task: '宿主已注入公式能力。正文使用显式公式段写出 \\sum_{i=1}^{n} i，采用展示式公式度量、字号 1.5em、相对于有效文字色的 0.25 颜色权重。不要生成原始美元符号简写。',
    expected: {
      type: 'node',
      text: [
        {
          segments: [
            {
              tex: '\\sum_{i=1}^{n} i',
              displayMode: true,
              fontSize: '1.5em',
              fill: 0.25,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'ND006',
    task: '宿主已注入公式能力。节点字体为 serif、18 个用户单位；一行混排的字体只改为 1.2em、倾斜 oblique，内容依次为“a”、行内公式 b、文字“c”。各段不要重复设置字体或颜色。',
    expected: {
      type: 'node',
      style: {
        font: {
          family: 'serif',
          size: 18,
        },
      },
      text: [
        {
          font: {
            size: '1.2em',
            style: 'oblique',
          },
          segments: [
            {
              text: 'a',
            },
            {
              tex: 'b',
            },
            {
              text: 'c',
            },
          ],
        },
      ],
    },
    mustOmit: ['text.0.segments.1.fontSize'],
  },
  {
    id: 'ND007',
    task: '宿主已注入公式能力。正文原文为“值 $x^2$”换行后“$$y=1$$”；请保留这些原始简写字符串和硬换行，不提前转换为公式段。',
    expected: {
      type: 'node',
      text: '值 $x^2$\n$$y=1$$',
    },
  },
  {
    id: 'ND008',
    task: '节点正文为“字号”；正文使用 22 个用户单位 字号、字体族 Inter, sans-serif、数值字重 500、斜体 italic。相对字号或预设交给编译期解析，不预先换算。',
    expected: {
      type: 'node',
      text: '字号',
      style: {
        font: {
          family: 'Inter, sans-serif',
          size: 22,
          weight: 500,
          style: 'italic',
        },
      },
    },
  },
  {
    id: 'ND009',
    task: '节点正文为“字号”；正文使用 名为 lg 的 Web 字号预设 字号、字体族 Inter, sans-serif、数值字重 500、斜体 italic。相对字号或预设交给编译期解析，不预先换算。',
    expected: {
      type: 'node',
      text: '字号',
      style: {
        font: {
          family: 'Inter, sans-serif',
          size: 'lg',
          weight: 500,
          style: 'italic',
        },
      },
    },
  },
  {
    id: 'ND010',
    task: '节点正文为“字号”；正文使用 1.25em 字号、字体族 Inter, sans-serif、数值字重 500、斜体 italic。相对字号或预设交给编译期解析，不预先换算。',
    expected: {
      type: 'node',
      text: '字号',
      style: {
        font: {
          family: 'Inter, sans-serif',
          size: '1.25em',
          weight: 500,
          style: 'italic',
        },
      },
    },
  },
  {
    id: 'ND011',
    task: '节点正文为“字号”；正文使用 1.5rem 字号、字体族 Inter, sans-serif、数值字重 500、斜体 italic。相对字号或预设交给编译期解析，不预先换算。',
    expected: {
      type: 'node',
      text: '字号',
      style: {
        font: {
          family: 'Inter, sans-serif',
          size: '1.5rem',
          weight: 500,
          style: 'italic',
        },
      },
    },
  },
];
