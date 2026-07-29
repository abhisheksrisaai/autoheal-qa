import {
  AIModelRouterInterface,
  AgentTask,
  TaskType,
  AIModel,
} from '../../types/agent.types';
import { getModelConfig } from '../../config/ai.config';

export class AIModelRouter implements AIModelRouterInterface {
  private routingTable: Map<TaskType, string>;

  constructor() {
    this.routingTable = new Map([
      ['heal', 'deepseek'],     // DeepSeek V4 Pro for healing
      ['plan', 'kimi'],         // Kimi K3 for planning
      ['execute', 'qwen'],      // Qwen3.7 Max for execution
      ['analyze', 'deepseek'],  // DeepSeek for analysis
      ['generate', 'kimi'],     // Kimi for generation
      ['validate', 'qwen'],     // Qwen for validation
    ]);
  }

  async route(task: AgentTask): Promise<AIModel> {
    const taskType = task.type as TaskType;
    const provider = this.selectModel(taskType);
    return provider;
  }

  selectModel(taskType: TaskType): AIModel {
    const provider = this.routingTable.get(taskType) || 'deepseek';
    const config = getModelConfig(provider);
    return {
      name: config.name,
      provider: config.provider,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    };
  }

  getModelForHealing(): AIModel {
    return this.selectModel('heal');
  }

  getModelForPlanning(): AIModel {
    return this.selectModel('plan');
  }

  getModelForExecution(): AIModel {
    return this.selectModel('execute');
  }
}
