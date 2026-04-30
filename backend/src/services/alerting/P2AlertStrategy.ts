import { AlertStrategy } from './AlertStrategy';
import { WorkItem } from '../../models/WorkItem';

// P2 = WARNING — Cache / Queue failures
export class P2AlertStrategy implements AlertStrategy {
  priority = 'P2';

  async notify(workItem: WorkItem): Promise<void> {
    // Production: Slack API notification
    console.warn(`[P2-ALERT] 🟡 WARNING: ${workItem.title}`);
    console.warn(`[P2-ALERT] Component: ${workItem.componentId} | Slack #incidents notified`);
    // TODO: await slack.postMessage({ channel: '#incidents', text: workItem.title });
  }
}
