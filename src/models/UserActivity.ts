import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: 'admin' | 'manager' | 'cashier';
  branchId?: mongoose.Types.ObjectId;
  sessionStart: Date;
  lastActivity: Date;
  currentPage: string;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  activities: {
    action: string;
    page: string;
    timestamp: Date;
    details?: Record<string, any>;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
    },
    userRole: {
      type: String,
      enum: ['admin', 'manager', 'cashier'],
      required: [true, 'User role is required'],
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },
    sessionStart: {
      type: Date,
      default: Date.now,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    currentPage: {
      type: String,
      default: '/dashboard',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    activities: [{
      action: {
        type: String,
        required: true,
      },
      page: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      details: {
        type: Schema.Types.Mixed,
        default: {},
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Index for querying active users efficiently
UserActivitySchema.index({ isActive: 1, lastActivity: -1 });
UserActivitySchema.index({ userId: 1, sessionStart: -1 });

// Method to update last activity
UserActivitySchema.methods.updateActivity = function(page: string, action?: string, details?: Record<string, any>) {
  this.lastActivity = new Date();
  this.currentPage = page;
  this.isActive = true;
  
  if (action) {
    this.activities.push({
      action,
      page,
      timestamp: new Date(),
      details: details || {},
    });
    
    // Keep only last 50 activities to prevent document bloat
    if (this.activities.length > 50) {
      this.activities = this.activities.slice(-50);
    }
  }
  
  return this.save();
};

// Method to mark session as inactive
UserActivitySchema.methods.endSession = function() {
  this.isActive = false;
  this.lastActivity = new Date();
  return this.save();
};

// Static method to get active users
UserActivitySchema.statics.getActiveUsers = function(minutesThreshold: number = 5) {
  const threshold = new Date(Date.now() - minutesThreshold * 60 * 1000);
  return this.find({
    isActive: true,
    lastActivity: { $gte: threshold }
  }).populate('userId', 'name email role avatar').sort({ lastActivity: -1 });
};

// Static method to cleanup old inactive sessions
UserActivitySchema.statics.cleanupOldSessions = function(daysOld: number = 7) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    isActive: false,
    lastActivity: { $lt: cutoff }
  });
};

export interface IUserActivityModel extends Model<IUserActivity> {
  getActiveUsers(minutesThreshold?: number): Promise<IUserActivity[]>;
  cleanupOldSessions(daysOld?: number): Promise<{ deletedCount?: number }>;
}

const UserActivity = (mongoose.models.UserActivity as IUserActivityModel) || mongoose.model<IUserActivity, IUserActivityModel>('UserActivity', UserActivitySchema);

export default UserActivity;
