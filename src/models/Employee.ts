import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IEmployee extends Document {
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  position: string;
  department?: string;
  salary: number;
  hireDate: Date;
  branchId?: mongoose.Types.ObjectId;
  isActive: boolean;
  performance: {
    totalSales: number;
    totalTransactions: number;
    averageTransactionValue: number;
    lastMonthSales: number;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    salary: {
      type: Number,
      required: [true, 'Salary is required'],
      min: [0, 'Salary cannot be negative'],
    },
    hireDate: {
      type: Date,
      required: [true, 'Hire date is required'],
      default: Date.now,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    performance: {
      totalSales: {
        type: Number,
        default: 0,
      },
      totalTransactions: {
        type: Number,
        default: 0,
      },
      averageTransactionValue: {
        type: Number,
        default: 0,
      },
      lastMonthSales: {
        type: Number,
        default: 0,
      },
    },
    attendance: {
      present: {
        type: Number,
        default: 0,
      },
      absent: {
        type: Number,
        default: 0,
      },
      late: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Employee: Model<IEmployee> = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
