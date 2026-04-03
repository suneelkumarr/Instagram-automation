import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  settings: {
    timezone: string;
    language: string;
    notifications: { email: boolean; slack: boolean; browser: boolean };
  };
  referrerId?: mongoose.Types.ObjectId;
  affiliateCode: string;
  affiliateEarnings: number;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    settings: {
      timezone: { type: String, default: 'UTC' },
      language: { type: String, default: 'en' },
      notifications: {
        email: { type: Boolean, default: true },
        slack: { type: Boolean, default: false },
        browser: { type: Boolean, default: true },
      },
    },
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    affiliateCode: { type: String, unique: true, default: () => uuidv4().substring(0, 8) },
    affiliateEarnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
