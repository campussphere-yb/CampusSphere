/**
 * api/client.js — Centralised API layer for CampusSphere.
 *
 * All backend calls go through this file.  Import the named export you need:
 *
 *   import { dashboardApi, mentionsApi, alertsApi } from '../api/client'
 *
 * The axios instance uses the Vite proxy (see vite.config.js), so every
 * request to /api/v1/... is forwarded to http://127.0.0.1:8000 automatically.
 * No CORS headers needed during development.
 */

import axios from 'axios'

// In development: Vite proxies /api/* → http://127.0.0.1:8000 (see vite.config.js).
// In production:  Set VITE_API_BASE_URL to your deployed backend, e.g.
//                 https://campussphere-api.fly.dev
//                 If unset, requests go to /api/v1 on the same origin (mock-only demo mode).
const BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1'

const http = axios.create({
  baseURL: BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getOverview:          ()           => http.get('/dashboard/overview'),
  getCounts:            ()           => http.get('/dashboard/counts'),
  getAiInsight:         ()           => http.get('/dashboard/ai-insight'),
  getRiskTrend:         (days = 30)  => http.get(`/dashboard/risk-trend?days=${days}`),
  getTrendingTopics:    (limit = 6)  => http.get(`/dashboard/trending-topics?limit=${limit}`),
  getSentimentBreakdown:()           => http.get('/dashboard/sentiment-breakdown'),
  getTopSources:        (limit = 5)  => http.get(`/dashboard/top-sources?limit=${limit}`),
  getRecentMentions:    (limit = 10) => http.get(`/dashboard/recent-mentions?limit=${limit}`),
  getRecentAlerts:      (limit = 10) => http.get(`/dashboard/recent-alerts?limit=${limit}`),
}

// ── Mentions ──────────────────────────────────────────────────────────────────
export const mentionsApi = {
  list:                 (params = {}) => http.get('/mentions', { params }),
  get:                  (id)          => http.get(`/mentions/${id}`),
  update:               (id, data)    => http.patch(`/mentions/${id}`, data),
  delete:               (id)          => http.delete(`/mentions/${id}`),
  getSuggestedResponses:(id)          => http.get(`/mentions/${id}/suggested-responses`),
  generateResponse:     (id)          => http.post(`/mentions/${id}/suggested-responses`),
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alertsApi = {
  list:   (params = {}) => http.get('/alerts', { params }),
  getOpen:()            => http.get('/alerts/open'),
  get:    (id)          => http.get(`/alerts/${id}`),
  create: (data)        => http.post('/alerts', data),
  update: (id, data)    => http.patch(`/alerts/${id}`, data),
  delete: (id)          => http.delete(`/alerts/${id}`),
}

// ── Connectors ────────────────────────────────────────────────────────────────
export const connectorsApi = {
  list:   ()         => http.get('/connectors'),
  get:    (id)       => http.get(`/connectors/${id}`),
  create: (data)     => http.post('/connectors', data),
  update: (id, data) => http.patch(`/connectors/${id}`, data),
  delete: (id)       => http.delete(`/connectors/${id}`),
  sync:   (id)       => http.post(`/connectors/${id}/sync`),
}

// ── Sources ───────────────────────────────────────────────────────────────────
export const sourcesApi = {
  list:   ()         => http.get('/sources'),
  get:    (id)       => http.get(`/sources/${id}`),
  create: (data)     => http.post('/sources', data),
  update: (id, data) => http.patch(`/sources/${id}`, data),
  delete: (id)       => http.delete(`/sources/${id}`),
}

// ── Summaries ─────────────────────────────────────────────────────────────────
export const summariesApi = {
  list:     ()     => http.get('/summaries'),
  getLatest:()     => http.get('/summaries/latest'),
  generate: (data) => http.post('/summaries/generate', data),
  get:      (id)   => http.get(`/summaries/${id}`),
  delete:   (id)   => http.delete(`/summaries/${id}`),
}

// ── Tracking ──────────────────────────────────────────────────────────────────
export const trackingApi = {
  listKeywords:   ()         => http.get('/tracking/keywords'),
  createKeyword:  (data)     => http.post('/tracking/keywords', data),
  updateKeyword:  (id, data) => http.patch(`/tracking/keywords/${id}`, data),
  deleteKeyword:  (id)       => http.delete(`/tracking/keywords/${id}`),
}

// ── Departments ───────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => http.get('/departments'),
}

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  analyze:         (text)                     => http.post('/ai/analyze', { text }),
  suggestResponse: (content, sentiment_label) => http.post('/ai/suggest-response', { content, sentiment_label }),
  generateSummary: (data)                     => http.post('/ai/generate-summary', data),
}

export default http
