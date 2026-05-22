import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
const exerciseCategories = [
  "cardio",
  "strength",
  "flexibility",
  "sports",
  "other",
] as const;

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const calorieLogSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    foodName: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, default: null },
    carbs: { type: Number, default: null },
    fat: { type: Number, default: null },
    mealType: { type: String, required: true, enum: mealTypes },
    loggedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { versionKey: false },
);

const stepLogSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    steps: { type: Number, required: true, min: 0 },
    date: { type: String, required: true, index: true },
    distanceKm: { type: Number, default: null },
    caloriesBurned: { type: Number, default: null },
    loggedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { versionKey: false },
);

const exerciseSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: exerciseCategories },
    durationMinutes: { type: Number, required: true, min: 1 },
    caloriesBurned: { type: Number, default: null },
    sets: { type: Number, default: null },
    reps: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    notes: { type: String, default: null },
    loggedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { versionKey: false },
);

type Counter = InferSchemaType<typeof counterSchema>;
type User = InferSchemaType<typeof userSchema>;
type Session = InferSchemaType<typeof sessionSchema>;
type CalorieLog = InferSchemaType<typeof calorieLogSchema>;
type StepLog = InferSchemaType<typeof stepLogSchema>;
type Exercise = InferSchemaType<typeof exerciseSchema>;

export type CalorieLogDocument = HydratedDocument<CalorieLog>;
export type StepLogDocument = HydratedDocument<StepLog>;
export type ExerciseDocument = HydratedDocument<Exercise>;
export type UserDocument = HydratedDocument<User>;
export type SessionDocument = HydratedDocument<Session>;

const CounterModel =
  mongoose.models.Counter ??
  mongoose.model<Counter>("Counter", counterSchema, "counters");

export const UserModel =
  mongoose.models.User ??
  mongoose.model<User>("User", userSchema, "users");

export const SessionModel =
  mongoose.models.Session ??
  mongoose.model<Session>("Session", sessionSchema, "sessions");

export const CalorieLogModel =
  mongoose.models.CalorieLog ??
  mongoose.model<CalorieLog>(
    "CalorieLog",
    calorieLogSchema,
    "calorie_logs",
  );

export const StepLogModel =
  mongoose.models.StepLog ??
  mongoose.model<StepLog>("StepLog", stepLogSchema, "step_logs");

export const ExerciseModel =
  mongoose.models.Exercise ??
  mongoose.model<Exercise>("Exercise", exerciseSchema, "exercises");

export async function nextSequenceValue(collectionName: string): Promise<number> {
  const counter = await CounterModel.findByIdAndUpdate(
    collectionName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  if (!counter) {
    throw new Error(`Unable to allocate id for ${collectionName}`);
  }

  return counter.seq;
}
