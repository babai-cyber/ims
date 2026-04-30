import { WorkItem, WorkItemStatus } from '../../models/WorkItem';
import { RCA } from '../../models/RCA';
import { postgres } from '../../config/db';

const VALID_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  OPEN: ['INVESTIGATING'],
  INVESTIGATING: ['RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
};

export class WorkItemStateMachine {
  static async transition(workItemId: string, targetStatus: WorkItemStatus): Promise<WorkItem> {
    const transaction = await postgres.transaction();

    try {
      const workItem = await WorkItem.findByPk(workItemId, { transaction, lock: true });
      if (!workItem) throw new Error('Work item not found');

      const currentStatus = workItem.status;
      const allowed = VALID_TRANSITIONS[currentStatus];

      if (!allowed.includes(targetStatus)) {
        throw new Error(
          `Invalid transition: ${currentStatus} → ${targetStatus}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`
        );
      }

      if (targetStatus === 'CLOSED') {
        const rca = await RCA.findOne({ where: { workItemId }, transaction });
        if (!rca) throw new Error('Cannot close incident: RCA is missing. Fill the RCA form first.');
        if (!rca.fixApplied || !rca.preventionSteps || !rca.rootCauseCategory) {
          throw new Error('Cannot close incident: RCA is incomplete. All fields required.');
        }

        const mttr = (rca.incidentEnd.getTime() - workItem.startTime.getTime()) / 60000;
        await workItem.update({ status: 'CLOSED', endTime: rca.incidentEnd, mttr }, { transaction });
      } else {
        await workItem.update({ status: targetStatus }, { transaction });
      }

      await transaction.commit();
      console.log(`[STATE] WorkItem ${workItemId}: ${currentStatus} → ${targetStatus}`);
      return workItem.reload();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
