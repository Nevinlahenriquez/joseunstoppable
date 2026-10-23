import { createHash } from 'node:crypto'

// Exercise and lesson videos live on Bunny Stream (José's own library). The
// browser uploads straight to Bunny over TUS; the API key never leaves here.

const API = 'https://video.bunnycdn.com'
export const TUS_ENDPOINT = 'https://video.bunnycdn.com/tusupload'
export const VIDEO_COLLECTION = 'Ejercicios'

interface BunnyConfig { apiKey: string; libraryId: string; cdn: string }

export function bunnyConfig(): BunnyConfig | null {
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim()
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim()
  const cdn = process.env.BUNNY_STREAM_CDN_HOSTNAME?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  if (!apiKey || !libraryId || !cdn) return null
  return { apiKey, libraryId, cdn }
}

async function bunny<T>(cfg: BunnyConfig, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/library/${cfg.libraryId}${path}`, {
    ...init,
    headers: { AccessKey: cfg.apiKey, accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}) },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Bunny ${init.method ?? 'GET'} ${path} failed (${res.status})`)
  const text = await res.text()
  return (text ? JSON.parse(text) : {}) as T
}

async function collectionId(cfg: BunnyConfig): Promise<string | undefined> {
  const res = await bunny<{ items?: { guid: string; name: string }[] }>(cfg, '/collections?page=1&itemsPerPage=100')
  const found = res.items?.find(c => c.name === VIDEO_COLLECTION)
  if (found) return found.guid
  const made = await bunny<{ guid: string }>(cfg, '/collections', { method: 'POST', body: JSON.stringify({ name: VIDEO_COLLECTION }) })
  return made.guid
}

export interface UploadTicket { videoId: string; hls: string; thumb: string; libraryId: string; signature: string; expire: number; endpoint: string }

export async function createUpload(cfg: BunnyConfig, title: string): Promise<UploadTicket> {
  const cid = await collectionId(cfg)
  const made = await bunny<{ guid: string }>(cfg, '/videos', { method: 'POST', body: JSON.stringify({ title, ...(cid ? { collectionId: cid } : {}) }) })
  const expire = Math.floor(Date.now() / 1000) + 24 * 60 * 60
  const signature = createHash('sha256').update(`${cfg.libraryId}${cfg.apiKey}${expire}${made.guid}`).digest('hex')
  return {
    videoId: made.guid,
    hls: `https://${cfg.cdn}/${made.guid}/playlist.m3u8`,
    thumb: `https://${cfg.cdn}/${made.guid}/thumbnail.jpg`,
    libraryId: cfg.libraryId, signature, expire, endpoint: TUS_ENDPOINT,
  }
}

export async function videoState(cfg: BunnyConfig, id: string): Promise<{ ready: boolean; failed: boolean; progress: number }> {
  const v = await bunny<{ status: number; encodeProgress: number }>(cfg, `/videos/${encodeURIComponent(id)}`)
  return { ready: v.status === 4, failed: v.status === 5 || v.status === 6, progress: v.encodeProgress ?? 0 }
}

export const isVideoId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
