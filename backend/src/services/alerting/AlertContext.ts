import { AlertStrategy } from './AlertStrategy';
import { P0AlertStrategy } from './P0AlertStrategy';
import { P2AlertStrategy } from './P2AlertStrategy';
import { WorkItem } from '../../models/WorkItem';

// Context — selects the correct alerting strategy based on component type
export class AlertContext {
  private strategy: AlertStrategy;

  constructor(componentType: string) {
    switch (componentType) {
      case 'RDBMS':
      case 'API':
      case 'MCP_HOST':
        this.strategy = new P0AlertStrategy();
        break;
      case 'CACHE':
      case 'QUEUE':
      case 'NOSQL':
      default:
        this.strategy = new P2AlertStrategy();
    }
  }

  async executeAlert(workItem: WorkItem): Promise<string> {
    await this.strategy.notify(workItem);
    return this.strategy.priority;
  }
}
