import { AlertStrategy } from './AlertStrategy';
import { WorkItem } from '../../models/WorkItem';

// P0 = CRITICAL — RDBMS / API / MCP failures
export class P0AlertStrategy implements AlertStrategy {
  priority = 'P0';

  async notify(workItem: WorkItem): Promise<void> {
    // Production: PagerDuty API + SMS + phone call
    console.error(`[P0-ALERT] 🔴 CRITICAL: ${workItem.title}`);
    console.error(`[P0-ALERT] Component: ${workItem.componentId} | Paging on-call engineer NOW!`);
    // TODO: await pagerduty.createIncident({ title: workItem.title, severity: 'critical' });
  }
}
