import { Schema, Types } from 'mongoose';
import { UserModel } from '../modules/users/users.model';

// Who did something, snapshotted onto a document ("Created / Updated By") so
// the name still shows if the user is later renamed or removed.
export interface ActorSnapshot {
  userId?: Types.ObjectId;
  name: string;
}

export const actorSnapshotSchema = new Schema<ActorSnapshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// The logged-in user (req.user.sub) as an ActorSnapshot.
export async function resolveActor(userId?: string): Promise<ActorSnapshot> {
  if (!userId || !Types.ObjectId.isValid(userId)) return { name: 'System' };
  const user = await UserModel.findById(userId).select('name').lean();
  return { userId: new Types.ObjectId(userId), name: user?.name ?? 'Unknown user' };
}
