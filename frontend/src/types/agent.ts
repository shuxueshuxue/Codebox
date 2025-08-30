export type AgentRole = '规划' | '前端' | '后端' | '测试' | '数据' | '运维'

export type Agent = {
  id: string
  name: string
  role: AgentRole
  desc?: string
}

export const roleOrder: AgentRole[] = ['规划', '前端', '后端', '测试', '数据', '运维']

export function makeFakeAgents(): Agent[] {
  return [
    { id: 'a-plan-1', name: 'Roadmap 规划器', role: '规划', desc: '拆分里程碑与任务' },
    { id: 'a-plan-2', name: '需求澄清官', role: '规划', desc: '用户故事与验收标准' },
    { id: 'a-fe-1', name: 'UI 组件师', role: '前端', desc: '组件封装/交互细节' },
    { id: 'a-fe-2', name: '性能巡检员', role: '前端', desc: '性能画像与优化建议' },
    { id: 'a-be-1', name: 'API 工程师', role: '后端', desc: '接口设计/实现' },
    { id: 'a-be-2', name: '存储管理员', role: '后端', desc: '模型/迁移/索引' },
    { id: 'a-qa-1', name: '测试用例官', role: '测试', desc: '单测/E2E/回归' },
    { id: 'a-data-1', name: '数据分析师', role: '数据', desc: '埋点/报表/洞察' },
    { id: 'a-devops-1', name: '发布管家', role: '运维', desc: 'CI/CD/监控' },
  ]
}
