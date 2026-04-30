import { DataTypes, Model } from 'sequelize';
import { postgres } from '../config/db';

export type WorkItemStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';

export class WorkItem extends Model {
  declare id: string;
  declare componentId: string;
  declare title: string;
  declare status: WorkItemStatus;
  declare priority: string;
  declare signalCount: number;
  declare startTime: Date;
  declare endTime: Date | null;
  declare mttr: number | null;
}

WorkItem.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    componentId: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'),
      defaultValue: 'OPEN',
    },
    priority: { type: DataTypes.STRING, defaultValue: 'P2' },
    signalCount: { type: DataTypes.INTEGER, defaultValue: 1 },
    startTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    endTime: { type: DataTypes.DATE, allowNull: true },
    mttr: { type: DataTypes.FLOAT, allowNull: true },
  },
  { sequelize: postgres, tableName: 'work_items', timestamps: true }
);
