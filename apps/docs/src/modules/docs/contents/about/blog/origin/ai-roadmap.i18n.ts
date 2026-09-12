import type { Lang } from '@/i18n';

export const aiRoadmapI18n: Record<
  Lang,
  Readonly<
    Record<
      | 'title'
      | 'fundamentals'
      | 'choosePath'
      | 'requiredForAnyPath'
      | 'papersWithCode'
      | 'git'
      | 'semanticVersioning'
      | 'keepAChangelog'
      | 'legend'
      | 'personalRecommendation'
      | 'availableOptions'
      | 'dataScientist'
      | 'machineLearning'
      | 'deepLearning'
      | 'dataEngineer'
      | 'bigDataEngineer'
      | 'recommended',
      string
    >
  >
> = {
  zh: {
    title: '2022 年 AI 专家',
    fundamentals: '基础知识',
    choosePath: '选择你的路径',
    requiredForAnyPath: '所有路径都需要',
    papersWithCode: 'Papers With Code',
    git: 'GIT - 版本控制',
    semanticVersioning: '语义化版本',
    keepAChangelog: '维护更新日志',
    legend: '图例',
    personalRecommendation: '个人推荐！',
    availableOptions: '可选方向',
    dataScientist: '数据科学家',
    machineLearning: '机器学习',
    deepLearning: '深度学习',
    dataEngineer: '数据工程师',
    bigDataEngineer: '大数据工程师',
    recommended: '推荐路径',
  },
  en: {
    title: 'AI Expert in 2022',
    fundamentals: 'Fundamentals',
    choosePath: 'Choose your path',
    requiredForAnyPath: 'Required for any path',
    papersWithCode: 'Papers With Code',
    git: 'GIT - Version Control',
    semanticVersioning: 'Semantic Versioning',
    keepAChangelog: 'Keep a Changelog',
    legend: 'Legend',
    personalRecommendation: 'Personal Recommendation!',
    availableOptions: 'Available Options',
    dataScientist: 'Data Scientist',
    machineLearning: 'Machine Learning',
    deepLearning: 'Deep Learning',
    dataEngineer: 'Data Engineer',
    bigDataEngineer: 'Big Data Engineer',
    recommended: 'recommended',
  },
};
