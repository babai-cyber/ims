import { WorkItem } from '../../models/WorkItem';

// Strategy Pattern Interface — all alerting strategies must implement this contract
export interface AlertStrategy {
  priority: string;
  notify(workItem: WorkItem): Promise<void>;
}
