/** 同一矩形从测量到正式放置的四帧 */
export const evaluationFlowI18n = {
  zh: {
    titles: ['① 测量宽度', '② 局部试排', '③ 选定放置', '④ 回放到父帧'],
    captions: ['宽度贡献 = 60', '局部中心 (0, 0)', '待提交：右移 100', '父帧中心 (100, 0)'],
  },
  en: {
    titles: ['① Measure width', '② Probe locally', '③ Select placement', '④ Replay into parent'],
    captions: ['Width contribution = 60', 'Local center (0, 0)', 'Pending: shift right 100', 'Parent center (100, 0)'],
  },
} as const;
