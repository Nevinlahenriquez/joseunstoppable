// ─────────────────────────────────────────────────────────────────────────────
// THE DATA MODEL. One shape for the demo store and for Supabase.
//
// Every record lives in a table with the same columns in Supabase
// (id, coach_id, client_id, data jsonb, created_at), so adding a field here
// never needs a migration. See supabase/schema.sql.
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = 'es' | 'en'

export interface Coach {
  id: string
  name: string
  email: string
  brandName: string
  tagline?: string
  logoUrl?: string
  /** Main brand colour (buttons, highlights). */
  primary: string
  /** Second colour (charts, badges). */
  accent: string
  lang: Lang
  photoUrl?: string
}

export type Goal = 'lose_fat' | 'recomp' | 'gain_muscle' | 'strength' | 'health' | 'performance'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Experience = 'beginner' | 'intermediate' | 'advanced'
export type Sex = 'male' | 'female'

export interface Intake {
  goal: Goal
  sex: Sex
  birthDate: string
  heightCm: number
  weightKg: number
  targetWeightKg: number
  activity: Activity
  daysPerWeek: number
  experience: Experience
  equipment: 'gym' | 'home' | 'both'
  injuries: string
  allergies: string
  diet: 'anything' | 'vegetarian' | 'vegan' | 'pescatarian' | 'other'
  mealsPerDay: number
  why: string
  completedAt: string
}

export interface Targets { kcal: number; protein: number; carbs: number; fat: number }

export interface Client {
  id: string
  coachId: string
  name: string
  email: string
  phone?: string
  avatarUrl?: string
  status: 'invited' | 'active' | 'paused'
  plan?: string
  intake?: Intake
  targets?: Targets
  coachNotes?: string
  createdAt: string
}

export interface Exercise {
  id: string
  coachId: string
  name: string
  muscle: string
  equipment: string
  /** Bunny HLS (playlist.m3u8), an mp4, or a YouTube/Vimeo link. */
  videoUrl?: string
  thumbUrl?: string
  portrait?: boolean
  cues: string
}

export interface WorkoutItem {
  exerciseId: string
  sets: number
  /** "12-10-8-8" or "10". One number per set, or one for all. */
  reps: string
  restSec: number
  /** Optional suggested load in kg, per set or one for all. */
  load?: string
  notes?: string
}

export interface WorkoutBlock { title: string; items: WorkoutItem[] }

export interface Workout {
  id: string
  coachId: string
  /** Null = a template in the coach's library. */
  clientId: string | null
  name: string
  /** yyyy-mm-dd, only on assigned workouts. */
  date?: string
  notes?: string
  blocks: WorkoutBlock[]
  createdAt: string
}

export interface SetLog { reps: number | null; kg: number | null; done: boolean }

export interface WorkoutLog {
  id: string
  coachId: string
  clientId: string
  workoutId: string
  workoutName: string
  date: string
  startedAt: string
  finishedAt?: string
  durationSec?: number
  /** RPE 1-10. */
  rpe?: number
  /** 1-5 stars. */
  rating?: number
  comment?: string
  /** When the coach marked the session as reviewed. */
  reviewedAt?: string
  /** The coach's note on this session, shown to the client on the result. */
  coachFeedback?: string
  /** exerciseId -> sets */
  sets: Record<string, SetLog[]>
  createdAt: string
}

export type MetricType = 'weight' | 'bodyfat' | 'waist' | 'chest' | 'hips' | 'arm' | 'thigh'

export interface Metric {
  id: string
  coachId: string
  clientId: string
  date: string
  type: MetricType
  value: number
  createdAt: string
}

export type Pose = 'front' | 'side' | 'back'

export interface Photo {
  id: string
  coachId: string
  clientId: string
  date: string
  pose: Pose
  /** Storage path (Supabase) or a data URL (demo). */
  path: string
  createdAt: string
}

export interface Food { name: string; qty: number; unit: string; kcal: number; p: number; c: number; f: number }
export interface MealOption { name: string; foods: Food[]; recipe?: string }
export interface Meal { name: string; time: string; options: MealOption[] }

export interface NutritionPlan {
  id: string
  coachId: string
  /** Null = a template. */
  clientId: string | null
  name: string
  targets: Targets
  meals: Meal[]
  notes?: string
  createdAt: string
}

export interface Message {
  id: string
  coachId: string
  clientId: string
  from: 'coach' | 'client'
  text: string
  /** Optional link to an exercise the message is about. */
  exerciseId?: string
  read: boolean
  createdAt: string
}

export interface Checkin {
  id: string
  coachId: string
  clientId: string
  date: string
  energy: number
  sleep: number
  stress: number
  hunger: number
  adherence: number
  wins: string
  struggles: string
  createdAt: string
}

export interface Resource {
  id: string
  coachId: string
  /** Null = shared with every client. */
  clientId: string | null
  title: string
  kind: 'video' | 'link' | 'text'
  url?: string
  body?: string
  createdAt: string
}

export interface Tables {
  resources: Resource
  coaches: Coach
  clients: Client
  exercises: Exercise
  workouts: Workout
  logs: WorkoutLog
  metrics: Metric
  photos: Photo
  nutrition: NutritionPlan
  messages: Message
  checkins: Checkin
}
export type TableName = keyof Tables

export const TABLE_NAMES: TableName[] = [
  'coaches', 'clients', 'exercises', 'workouts', 'logs', 'metrics', 'photos', 'nutrition', 'messages', 'checkins', 'resources',
]
