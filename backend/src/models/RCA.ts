import { DataTypes, Model } from 'sequelize';
import { postgres } from '../config/db';

export class RCA extends Model {
  declare id: string;
  declare workItemId: string;
  declare incidentStart: Date;
  declare incidentEnd: Date;
  declare rootCauseCategory: string;
  declare fixApplied: string;
  declare preventionSteps: string;
}

RCA.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workItemId: { type: DataTypes.UUID, allowNull: false, unique: true },
    incidentStart: { type: DataTypes.DATE, allowNull: false },
    incidentEnd: { type: DataTypes.DATE, allowNull: false },
    rootCauseCategory: {
      type: DataTypes.ENUM(
        'HARDWARE_FAILURE', 'SOFTWARE_BUG', 'CONFIGURATION_ERROR',
        'CAPACITY_EXHAUSTION', 'NETWORK_ISSUE', 'HUMAN_ERROR', 'THIRD_PARTY'
      ),
      allowNull: false,
    },
    fixApplied: { type: DataTypes.TEXT, allowNull: false },
    preventionSteps: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize: postgres, tableName: 'rca_records', timestamps: true }
);
