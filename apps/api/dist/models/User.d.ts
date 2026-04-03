import mongoose, { Document } from 'mongoose';
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
        notifications: {
            email: boolean;
            slack: boolean;
            browser: boolean;
        };
    };
    referrerId?: mongoose.Types.ObjectId;
    affiliateCode: string;
    affiliateEarnings: number;
    comparePassword(password: string): Promise<boolean>;
}
export declare const User: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=User.d.ts.map