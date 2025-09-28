const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

let token = localStorage.getItem('token') || '';

export function setToken(t) {
  token = t || '';
  if (t) localStorage.setItem('token', t); else localStorage.removeItem('token');
}

async function request(path, { method = 'GET', body, headers = {}, formData } = {}) {
  const opts = { method, headers: { ...headers } };
  if (formData) {
    opts.body = formData;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    let err;
    try { const j = await res.json(); err = j.error || JSON.stringify(j); } catch { err = res.statusText; }
    throw new Error(err);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  updateEventJoinDisable: (eventId, joinDisabled, joinDisableTime) => request(`/events/${eventId}/join-disable`, { method: 'PATCH', body: { joinDisabled, joinDisableTime } }),
  updateEventCapacity: (eventId, capacity) => request(`/events/${eventId}/capacity`, { method: 'PATCH', body: { capacity } }),
  // Auth (unified)
  login: (identifier, password) => request('/auth/login', { method: 'POST', body: { identifier, password } }),
  changeStudentPassword: (currentPassword, newPassword, confirmPassword) => request('/auth/password/change', { method: 'POST', body: { currentPassword, newPassword, confirmPassword } }),

  // Students
  uploadStudentsCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/students/upload', { method: 'POST', formData: fd });
  },

  // Events
  listEvents: () => request('/events'),
  createEvent: ({ name, description, startDate, endDate, template }) => {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    if (template) fd.append('template', template);
    return request('/events', { method: 'POST', formData: fd });
  },
  createSpecialEvent: ({ name, description, startDate, endDate, template, csv }) => {
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    if (startDate) fd.append('startDate', startDate);
    if (endDate) fd.append('endDate', endDate);
    if (template) fd.append('template', template);
    if (csv) fd.append('csv', csv);
    return request('/events/special', { method: 'POST', formData: fd });
  },
  joinEvent: (eventId) => request(`/events/${eventId}/join`, { method: 'POST' }),
  exportParticipantsCsv: (eventId) => request(`/events/${eventId}/participants.csv`),
  updateEventTemplate: (eventId, file) => {
    const fd = new FormData();
    fd.append('template', file);
    return request(`/events/${eventId}/template`, { method: 'POST', formData: fd });
  },
  deleteEventTemplate: (eventId) => request(`/events/${eventId}/template`, { method: 'DELETE' }),
  getEvent: (eventId) => request(`/events/${eventId}`),
  getEventAnalytics: (eventId) => request(`/events/${eventId}/analytics`),
  getEventTemplateUrl: (eventId) => request(`/events/${eventId}/template-url`),

  // Pairing
  generatePairs: (eventId) => request(`/pairing/${eventId}/generate`, { method: 'POST' }),
  listPairs: (eventId) => request(`/pairing/${eventId}`),
  setPairMeetingLink: (pairId, meetingLink) => request(`/pairing/pair/${pairId}/link`, { method: 'POST', body: { meetingLink } }),

  // Scheduling
  proposeSlots: (pairId, slots) => request(`/schedule/${pairId}/propose`, { method: 'POST', body: { slots } }),
  confirmSlot: (pairId, scheduledAt, meetingLink) => request(`/schedule/${pairId}/confirm`, { method: 'POST', body: { scheduledAt, meetingLink } }),
  rejectSlots: (pairId) => request(`/schedule/${pairId}/reject`, { method: 'POST' }),

  // Feedback
  submitFeedback: (pairId, marks, comments) => request('/feedback/submit', { method: 'POST', body: { pairId, marks, comments } }),
  exportFeedbackCsv: (eventId) => request(`/feedback/event/${eventId}.csv`),
  listFeedback: (qs='') => request(`/feedback/admin/list${qs ? '?' + qs : ''}`),
  exportFilteredFeedbackCsv: (qs='') => request(`/feedback/admin/export.csv${qs ? '?' + qs : ''}`),
  myFeedback: (eventId) => request(`/feedback/mine${eventId ? ('?eventId=' + eventId) : ''}`),
  feedbackForMe: (eventId) => request(`/feedback/for-me${eventId ? ('?eventId=' + eventId) : ''}`),
};
