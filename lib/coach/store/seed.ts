import type {
  Checkin, Client, Coach, Exercise, Message, Metric, NutritionPlan, Resource, Tables, Workout, WorkoutBlock, WorkoutLog,
} from '../types'
import { addDays, repsPerSet, weekStart, ymd } from '../util'
import { targetsFrom } from '../fitness'

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA. Only used when no Supabase keys are set, so the app can be clicked
// through on a preview. Every date is relative to today so it never looks stale.
// Nothing here is a real client of José.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_COACH_ID = 'coach-main'
export const DEMO_CLIENT_ID = 'client-nevin'

const now = () => new Date().toISOString()

function ex(id: string, name: string, muscle: string, equipment: string, cues: string, portrait = true): Exercise {
  return { id, coachId: DEMO_COACH_ID, name, muscle, equipment, cues, portrait }
}

const EXERCISES: Exercise[] = [
  ex('ex-goblet', 'Sentadilla goblet con disco en los talones', 'Cuádriceps', 'Mancuerna', 'Talones elevados sobre el disco.\nPecho arriba, rodillas hacia delante.\nBaja controlado 3 segundos, sube fuerte.'),
  ex('ex-deadlift', 'Peso muerto', 'Isquios y glúteo', 'Barra', 'Barra pegada a las piernas.\nEspalda neutra, empuja el suelo.\nSubimos arriba recto, sin hiperextender.'),
  ex('ex-lunge', 'Zancada estática', 'Cuádriceps y glúteo', 'Mancuernas', 'Paso largo, tronco vertical.\nRodilla de atrás casi toca el suelo.\nEmpuja con el talón de delante.'),
  ex('ex-legcurl', 'Curl femoral tumbado', 'Isquios', 'Máquina', 'Cadera pegada al banco.\nFuerte arriba, lento abajo.'),
  ex('ex-legext', 'Extensión de cuádriceps a una pierna', 'Cuádriceps', 'Máquina', 'Pausa de 1 segundo arriba.\nControla la bajada.'),
  ex('ex-hipthrust', 'Hip thrust', 'Glúteo', 'Barra', 'Barbilla al pecho.\nAprieta glúteo arriba 2 segundos.'),
  ex('ex-bench', 'Press banca', 'Pecho', 'Barra', 'Escápulas juntas y abajo.\nBarra a la parte baja del pecho.'),
  ex('ex-incline', 'Press inclinado con mancuernas', 'Pecho superior', 'Mancuernas', 'Banco a 30 grados.\nCodos a 45 grados del cuerpo.'),
  ex('ex-ohp', 'Press militar', 'Hombro', 'Barra', 'Glúteo y abdomen apretados.\nCabeza atraviesa al subir.'),
  ex('ex-lateral', 'Elevaciones laterales', 'Hombro', 'Mancuernas', 'Sube con el codo, no con la mano.\nSin balanceo.'),
  ex('ex-pullup', 'Dominadas', 'Espalda', 'Peso corporal', 'Pecho a la barra.\nBaja completo.'),
  ex('ex-row', 'Remo con barra', 'Espalda', 'Barra', 'Torso a 45 grados.\nTira hacia el ombligo.'),
  ex('ex-curl', 'Curl de bíceps', 'Bíceps', 'Mancuernas', 'Codos quietos.\nGira la muñeca al subir.'),
  ex('ex-plank', 'Plancha', 'Core', 'Peso corporal', 'Línea recta de cabeza a talones.\nRespira.'),
]

function block(title: string, items: [string, number, string, number][]): WorkoutBlock {
  return { title, items: items.map(([exerciseId, sets, reps, restSec]) => ({ exerciseId, sets, reps, restSec })) }
}

const TEMPLATES: Omit<Workout, 'id' | 'clientId' | 'date' | 'createdAt'>[] = [
  {
    coachId: DEMO_COACH_ID, name: 'Piernas', notes: 'Calienta 10 minutos en bici antes de empezar.',
    blocks: [
      block('Fuerza', [['ex-goblet', 4, '12-10-8-8', 90], ['ex-deadlift', 3, '10-8-8', 120], ['ex-lunge', 3, '12-10-8', 90]]),
      block('Accesorios', [['ex-legcurl', 3, '10-8-8', 60], ['ex-legext', 3, '12-10-10', 60]]),
    ],
  },
  {
    coachId: DEMO_COACH_ID, name: 'Empuje',
    blocks: [
      block('Fuerza', [['ex-bench', 4, '10-8-6-6', 120], ['ex-ohp', 3, '10-8-8', 90]]),
      block('Accesorios', [['ex-incline', 3, '12', 75], ['ex-lateral', 3, '15', 45]]),
    ],
  },
  {
    coachId: DEMO_COACH_ID, name: 'Tirón y core',
    blocks: [
      block('Fuerza', [['ex-pullup', 4, '8-8-6-6', 120], ['ex-row', 3, '10', 90]]),
      block('Accesorios', [['ex-curl', 3, '12', 60], ['ex-hipthrust', 3, '12', 75], ['ex-plank', 3, '45', 45]]),
    ],
  },
]

/** Starting kg per exercise for the demo client's history. */
const BASE_KG: Record<string, number> = {
  'ex-goblet': 20, 'ex-deadlift': 70, 'ex-lunge': 14, 'ex-legcurl': 30, 'ex-legext': 20,
  'ex-bench': 60, 'ex-ohp': 37.5, 'ex-incline': 20, 'ex-lateral': 8,
  'ex-pullup': 0, 'ex-row': 50, 'ex-curl': 12, 'ex-hipthrust': 60, 'ex-plank': 0,
}

function nutritionPlan(clientId: string | null, kcal: number, protein: number, carbs: number, fat: number): NutritionPlan {
  return {
    id: clientId ? `np-${clientId}` : 'np-template-recomp',
    coachId: DEMO_COACH_ID,
    clientId,
    name: 'Recomposición y ganancia de masa muscular',
    targets: { kcal, protein, carbs, fat },
    notes: 'Bebe 3 litros de agua al día. Si un día entrenas tarde, mueve la cena después del entreno.',
    createdAt: now(),
    meals: [
      {
        name: 'Desayuno', time: '08:00', options: [
          { name: 'Avena proteica', recipe: 'Cuece la avena con la leche, añade la proteína al final y la fruta por encima.', foods: [
            { name: 'Copos de avena', qty: 70, unit: 'g', kcal: 265, p: 9, c: 42, f: 5 },
            { name: 'Leche semidesnatada', qty: 250, unit: 'ml', kcal: 115, p: 8, c: 12, f: 4 },
            { name: 'Proteína whey', qty: 30, unit: 'g', kcal: 120, p: 24, c: 3, f: 2 },
            { name: 'Plátano', qty: 1, unit: 'ud', kcal: 105, p: 1, c: 27, f: 0 },
          ] },
          { name: 'Tostadas con huevos', foods: [
            { name: 'Pan integral', qty: 80, unit: 'g', kcal: 200, p: 8, c: 36, f: 3 },
            { name: 'Huevos', qty: 3, unit: 'ud', kcal: 215, p: 19, c: 1, f: 15 },
            { name: 'Aguacate', qty: 40, unit: 'g', kcal: 64, p: 1, c: 3, f: 6 },
            { name: 'Naranja', qty: 1, unit: 'ud', kcal: 62, p: 1, c: 15, f: 0 },
          ] },
        ],
      },
      {
        name: 'Comida', time: '13:30', options: [
          { name: 'Pollo con arroz y verduras', foods: [
            { name: 'Pechuga de pollo', qty: 180, unit: 'g', kcal: 297, p: 56, c: 0, f: 6 },
            { name: 'Arroz basmati (crudo)', qty: 90, unit: 'g', kcal: 315, p: 7, c: 70, f: 1 },
            { name: 'Verduras salteadas', qty: 200, unit: 'g', kcal: 70, p: 3, c: 12, f: 1 },
            { name: 'Aceite de oliva', qty: 10, unit: 'ml', kcal: 88, p: 0, c: 0, f: 10 },
          ] },
          { name: 'Salmón con patata', foods: [
            { name: 'Salmón', qty: 160, unit: 'g', kcal: 330, p: 35, c: 0, f: 21 },
            { name: 'Patata cocida', qty: 300, unit: 'g', kcal: 260, p: 6, c: 58, f: 0 },
            { name: 'Ensalada verde', qty: 150, unit: 'g', kcal: 30, p: 2, c: 5, f: 0 },
          ] },
        ],
      },
      {
        name: 'Merienda', time: '17:30', options: [
          { name: 'Yogur con frutos secos', foods: [
            { name: 'Yogur griego 0%', qty: 250, unit: 'g', kcal: 145, p: 25, c: 9, f: 0 },
            { name: 'Nueces', qty: 20, unit: 'g', kcal: 131, p: 3, c: 3, f: 13 },
            { name: 'Arándanos', qty: 80, unit: 'g', kcal: 46, p: 1, c: 11, f: 0 },
          ] },
        ],
      },
      {
        name: 'Cena', time: '21:00', options: [
          { name: 'Ternera con boniato', foods: [
            { name: 'Ternera magra', qty: 170, unit: 'g', kcal: 260, p: 46, c: 0, f: 8 },
            { name: 'Boniato', qty: 250, unit: 'g', kcal: 215, p: 4, c: 50, f: 0 },
            { name: 'Brócoli', qty: 150, unit: 'g', kcal: 51, p: 4, c: 10, f: 1 },
          ] },
          { name: 'Tortilla y ensalada', foods: [
            { name: 'Huevos', qty: 2, unit: 'ud', kcal: 143, p: 13, c: 1, f: 10 },
            { name: 'Claras de huevo', qty: 150, unit: 'ml', kcal: 78, p: 16, c: 1, f: 0 },
            { name: 'Pan integral', qty: 60, unit: 'g', kcal: 150, p: 6, c: 27, f: 2 },
            { name: 'Ensalada con tomate', qty: 200, unit: 'g', kcal: 50, p: 2, c: 9, f: 0 },
          ] },
        ],
      },
    ],
  }
}

interface DemoClientSpec {
  id: string; name: string; email: string; weeksIn: number; skipRate: number; startKg: number; dropPerWeek: number
  status: Client['status']; plan: string
}

const CLIENTS: DemoClientSpec[] = [
  { id: DEMO_CLIENT_ID, name: 'Nevin Henriquez', email: 'nevin@example.com', weeksIn: 6, skipRate: 0.15, startKg: 90, dropPerWeek: 0.4, status: 'active', plan: 'Online 1:1' },
  { id: 'client-laura', name: 'Laura Martín', email: 'laura@example.com', weeksIn: 9, skipRate: 0.05, startKg: 68, dropPerWeek: 0.5, status: 'active', plan: 'Online 1:1' },
  { id: 'client-carlos', name: 'Carlos Ruiz', email: 'carlos@example.com', weeksIn: 4, skipRate: 0.55, startKg: 96, dropPerWeek: 0.2, status: 'active', plan: 'Online 1:1' },
  { id: 'client-marta', name: 'Marta Gómez', email: 'marta@example.com', weeksIn: 0, skipRate: 0, startKg: 0, dropPerWeek: 0, status: 'invited', plan: 'Online 1:1' },
]

/** Deterministic noise so the demo looks the same on every load. */
function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

export function buildSeed(): { [K in keyof Tables]: Tables[K][] } {
  const today = ymd()
  const coach: Coach = {
    id: DEMO_COACH_ID,
    name: 'José Sánchez',
    email: 'hola@joseunstoppable.com',
    brandName: 'José Unstoppable',
    tagline: 'Entrena con propósito',
    primary: '#2D6BFF',
    accent: '#0B3A8F',
    lang: 'es',
  }

  const clients: Client[] = []
  const workouts: Workout[] = TEMPLATES.map((t, i) => ({ ...t, id: `wt-${i + 1}`, clientId: null, createdAt: now() }))
  const logs: WorkoutLog[] = []
  const metrics: Metric[] = []
  const nutrition: NutritionPlan[] = [nutritionPlan(null, 2400, 180, 250, 70)]
  const messages: Message[] = []
  const checkins: Checkin[] = []

  CLIENTS.forEach((spec, ci) => {
    const start = addDays(weekStart(today), -7 * spec.weeksIn)
    const client: Client = {
      id: spec.id, coachId: DEMO_COACH_ID, name: spec.name, email: spec.email, status: spec.status, plan: spec.plan,
      createdAt: new Date(start).toISOString(),
    }
    if (spec.status === 'invited') { clients.push(client); return }

    client.intake = {
      goal: ci === 1 ? 'lose_fat' : 'recomp', sex: ci === 1 ? 'female' : 'male', birthDate: ci === 0 ? '1991-03-14' : ci === 1 ? '1995-07-02' : '1987-11-20',
      heightCm: ci === 1 ? 166 : 182, weightKg: spec.startKg, targetWeightKg: spec.startKg - 6, activity: 'moderate',
      daysPerWeek: 3, experience: ci === 2 ? 'beginner' : 'intermediate', equipment: 'gym',
      injuries: ci === 0 ? 'Molestia leve en la rodilla izquierda en sentadilla profunda.' : '', allergies: '',
      diet: 'anything', mealsPerDay: 4, why: 'Quiero sentirme fuerte y con energía todo el día.', completedAt: client.createdAt,
    }
    client.targets = targetsFrom(client.intake)
    clients.push(client)

    const np = nutritionPlan(spec.id, client.targets.kcal, client.targets.protein, client.targets.carbs, client.targets.fat)
    nutrition.push(np)

    // Mon / Wed / Fri, rotating the three templates, from start until the end of this week.
    const end = addDays(weekStart(today), 6)
    let n = 0
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const dow = new Date(d + 'T12:00').getDay()
      if (dow !== 1 && dow !== 3 && dow !== 5) continue
      const t = TEMPLATES[n % 3]
      const w: Workout = { ...t, id: `w-${spec.id}-${n}`, clientId: spec.id, date: d, createdAt: now() }
      workouts.push(w)
      const week = Math.floor(n / 3)
      if (d < today && rand(ci * 1000 + n) > spec.skipRate) {
        const sets: WorkoutLog['sets'] = {}
        for (const b of t.blocks) for (const it of b.items) {
          const base = BASE_KG[it.exerciseId] ?? 10
          const kg = base ? Math.round((base * (1 + week * 0.035) + (ci === 1 ? -base * 0.35 : 0)) * 2) / 2 : null
          sets[it.exerciseId] = repsPerSet(it.reps, it.sets).map((r, si) => ({
            reps: Math.max(1, r - (rand(ci * 77 + n * 13 + si) > 0.8 ? 1 : 0)),
            kg: kg === null ? null : kg + (si > 1 ? 2.5 : 0),
            // Now and then the last set is skipped, so the review shows a partial exercise.
            done: !(si === it.sets - 1 && rand(ci * 31 + n * 7 + si) > 0.85),
          }))
        }
        const startedAt = new Date(d + 'T18:30:00').toISOString()
        const dur = 3600 + Math.round(rand(n + ci) * 1200)
        logs.push({
          id: `log-${spec.id}-${n}`, coachId: DEMO_COACH_ID, clientId: spec.id, workoutId: w.id, workoutName: w.name, date: d,
          startedAt, finishedAt: new Date(new Date(startedAt).getTime() + dur * 1000).toISOString(), durationSec: dur,
          rpe: 7 + Math.round(rand(n * 3 + ci) * 2), rating: 4 + Math.round(rand(n * 5) * 1),
          comment: n % 4 === 1 ? 'Muy buena sesión, la última serie costó.' : undefined,
          // Older sessions were already reviewed by the coach; the last few wait for him.
          reviewedAt: d < addDays(today, -4) ? new Date(d + 'T21:00:00').toISOString() : undefined,
          sets, createdAt: startedAt,
        })
      }
      n++
    }

    // Weekly weigh-ins and a waist measurement every two weeks.
    for (let w = 0; w <= spec.weeksIn; w++) {
      const date = addDays(start, w * 7)
      if (date > today) break
      const kg = Math.round((spec.startKg - spec.dropPerWeek * w + (rand(w + ci * 9) - 0.5) * 0.6) * 10) / 10
      metrics.push({ id: `m-${spec.id}-w${w}`, coachId: DEMO_COACH_ID, clientId: spec.id, date, type: 'weight', value: kg, createdAt: now() })
      if (w % 2 === 0) {
        metrics.push({ id: `m-${spec.id}-c${w}`, coachId: DEMO_COACH_ID, clientId: spec.id, date, type: 'waist', value: Math.round((ci === 1 ? 78 : 95) - w * 0.5), createdAt: now() })
      }
    }

    if (spec.weeksIn >= 2) {
      checkins.push({
        id: `ck-${spec.id}`, coachId: DEMO_COACH_ID, clientId: spec.id, date: addDays(weekStart(today), -1),
        energy: 4, sleep: ci === 2 ? 2 : 4, stress: 3, hunger: 3, adherence: ci === 2 ? 2 : 4,
        wins: ci === 2 ? 'Fui dos días al gimnasio.' : 'Subí peso en peso muerto y dormí mejor.',
        struggles: ci === 2 ? 'Mucho trabajo, me salté entrenos.' : 'Los fines de semana me cuesta con la comida.',
        createdAt: now(),
      })
    }
  })

  const yesterday = addDays(today, -1)
  messages.push(
    { id: 'msg-1', coachId: DEMO_COACH_ID, clientId: DEMO_CLIENT_ID, from: 'coach', text: '¡Bienvenido Nevin! Esta semana nos centramos en técnica. Grábate la sentadilla y me la mandas por aquí.', read: true, createdAt: new Date(addDays(today, -5) + 'T09:12').toISOString() },
    { id: 'msg-2', coachId: DEMO_COACH_ID, clientId: DEMO_CLIENT_ID, from: 'client', text: 'Hecho. ¿Bajo más en el peso muerto o así está bien?', exerciseId: 'ex-deadlift', read: true, createdAt: new Date(yesterday + 'T19:40').toISOString() },
    { id: 'msg-3', coachId: DEMO_COACH_ID, clientId: DEMO_CLIENT_ID, from: 'coach', text: 'Así está perfecto. La próxima semana subimos 2,5 kg en cada serie.', read: false, createdAt: new Date(yesterday + 'T21:05').toISOString() },
    { id: 'msg-4', coachId: DEMO_COACH_ID, clientId: 'client-carlos', from: 'client', text: 'Esta semana voy muy liado, ¿puedo hacer 2 días en vez de 3?', read: false, createdAt: new Date(yesterday + 'T08:30').toISOString() },
  )

  const resources: Resource[] = [
    { id: 'res-1', coachId: DEMO_COACH_ID, clientId: null, title: 'Cómo leer tu plan de entrenamiento', kind: 'text', body: 'Cada sesión tiene bloques. En cada ejercicio verás las series, las repeticiones de cada serie y el descanso.\n\nApunta los kilos de cada serie al terminarla. Así veo tu progreso y subimos peso cuando toca.\n\nSi algo duele (no es esfuerzo, es dolor), para y escríbeme por el chat.', createdAt: now() },
    { id: 'res-2', coachId: DEMO_COACH_ID, clientId: null, title: 'Guía de proteína: cuánta y de dónde', kind: 'text', body: 'Tu objetivo de proteína está en tu plan de nutrición. Repártela en 3 o 4 comidas.\n\nFuentes fáciles: pollo, pavo, huevos, claras, yogur griego, atún, ternera magra, tofu y proteína en polvo.', createdAt: now() },
    { id: 'res-3', coachId: DEMO_COACH_ID, clientId: null, title: 'Fotos de progreso: cómo hacerlas bien', kind: 'text', body: 'Misma luz, mismo sitio, misma hora (mejor por la mañana en ayunas).\n\nTres fotos: frente, perfil y espalda. Brazos relajados. Cada 2 semanas es suficiente.', createdAt: now() },
  ]

  return {
    resources,
    coaches: [coach], clients, exercises: EXERCISES, workouts, logs, metrics, photos: [], nutrition, messages, checkins,
  }
}
