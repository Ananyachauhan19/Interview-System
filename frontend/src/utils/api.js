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
  
  const url = `${API_BASE}${path}`;
  console.log(`[API] ${method} ${url}`, body ? { body } : '');
  
  try {
    const res = await fetch(url, opts);
    console.log(`[API] Response status: ${res.status}`);
    
    if (!res.ok) {
      let err;
      try { 
        const j = await res.json(); 
        err = new Error(j.error || j.message || JSON.stringify(j));
        err.response = { status: res.status, data: j };
      } catch { 
        err = new Error(res.statusText);
        err.response = { status: res.status };
      }
      throw err;
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  } catch (err) {
    console.error(`[API] Error:`, err);
    throw err;
  }
}

export const api = {
  updateEventJoinDisable: (eventId, joinDisabled, joinDisableTime) => request(`/events/${eventId}/join-disable`, { method: 'PATCH', body: { joinDisabled, joinDisableTime } }),
  // Auth (unified)
  me: () => request('/auth/me'),
  updateMyProfile: (body) => request('/auth/me', { method: 'PUT', body }),
  updateMyAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return request('/auth/me/avatar', { method: 'PUT', formData: fd });
  },
  getStudentActivity: () => request('/auth/activity'),
  getStudentStats: () => request('/auth/stats'),
  login: (identifier, password) => request('/auth/login', { method: 'POST', body: { identifier, password } }),
  changePassword: (currentPassword, newPassword) => request('/auth/password/change', { method: 'POST', body: { currentPassword, newPassword, confirmPassword: newPassword } }),
  changeStudentPassword: (currentPassword, newPassword, confirmPassword) => request('/auth/password/change', { method: 'POST', body: { currentPassword, newPassword, confirmPassword } }),
  changeAdminPassword: (currentPassword, newPassword, confirmPassword) => request('/auth/password/admin-change', { method: 'POST', body: { currentPassword, newPassword, confirmPassword } }),
  requestPasswordReset: (email) => request('/auth/password/request-reset', { method: 'POST', body: { email } }),
  resetPassword: (token, newPassword) => request('/auth/password/reset', { method: 'POST', body: { token, newPassword } }),

  // Students
  listAllStudents: (search = '') => request(`/students/list${search ? '?search=' + encodeURIComponent(search) : ''}`),
  listAllSpecialStudents: (search = '') => request(`/students/special${search ? '?search=' + encodeURIComponent(search) : ''}`),
  listSpecialStudentsByEvent: (eventId) => request(`/students/special/${eventId}`),
  getStudentActivityByAdmin: (studentId) => request(`/students/${studentId}/activity`),
  getStudentStatsByAdmin: (studentId) => request(`/students/${studentId}/stats`),
  checkStudentsCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/students/check', { method: 'POST', formData: fd });
  },
  uploadStudentsCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/students/upload', { method: 'POST', formData: fd });
  },
  createStudent: (body) => request('/students/create', { method: 'POST', body }),

  // Coordinators
  listAllCoordinators: (search = '') => request(`/coordinators/list${search ? '?search=' + encodeURIComponent(search) : ''}`),
  createCoordinator: (body) => request('/coordinators/create', { method: 'POST', body }),

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
  checkSpecialEventCsv: (file) => {
    const fd = new FormData();
    fd.append('csv', file);
    return request('/events/special/check-csv', { method: 'POST', formData: fd });
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

  listPairs: (eventId) => request(`/pairing/${eventId}`),
  getPairDetails: (pairId) => request(`/pairing/pair/${pairId}`),
  setPairMeetingLink: (pairId, meetingLink) => request(`/pairing/pair/${pairId}/link`, { method: 'POST', body: { meetingLink } }),

  // Scheduling
  proposeSlots: (pairId, slots) => request(`/schedule/${pairId}/propose`, { method: 'POST', body: { slots } }),
  confirmSlot: (pairId, scheduledAt, meetingLink) => request(`/schedule/${pairId}/confirm`, { method: 'POST', body: { scheduledAt, meetingLink } }),
  rejectSlots: (pairId) => request(`/schedule/${pairId}/reject`, { method: 'POST' }),

  // Feedback
  submitFeedback: (pairId, ratings, suggestions) => request('/feedback/submit', { method: 'POST', body: { pairId, ratings, suggestions } }),
  exportFeedbackCsv: (eventId) => request(`/feedback/event/${eventId}.csv`),
  listFeedback: (qs='') => request(`/feedback/admin/list${qs ? '?' + qs : ''}`),
  exportFilteredFeedbackCsv: (qs='') => request(`/feedback/admin/export.csv${qs ? '?' + qs : ''}`),
  listCoordinatorFeedback: (qs='') => request(`/feedback/coordinator/list${qs ? '?' + qs : ''}`),
  exportCoordinatorFeedbackCsv: (qs='') => request(`/feedback/coordinator/export.csv${qs ? '?' + qs : ''}`),
  myFeedback: (eventId) => request(`/feedback/mine${eventId ? ('?eventId=' + eventId) : ''}`),
  feedbackForMe: (eventId) => request(`/feedback/for-me${eventId ? ('?eventId=' + eventId) : ''}`),

  // Semesters, Subjects, Chapters, and Topics (Coordinator only)
  listSemesters: () => request('/subjects'),
  createSemester: (semesterName, semesterDescription) => request('/subjects', { method: 'POST', body: { semesterName, semesterDescription } }),
  updateSemester: (id, data) => request(`/subjects/${id}`, { method: 'PUT', body: data }),
  deleteSemester: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
  reorderSemesters: (semesterIds) => request('/subjects/reorder', { method: 'POST', body: { semesterIds } }),
  
  addSubject: (semesterId, subjectName, subjectDescription) => request(`/subjects/${semesterId}/subjects`, { method: 'POST', body: { subjectName, subjectDescription } }),
  updateSubject: (semesterId, subjectId, data) => request(`/subjects/${semesterId}/subjects/${subjectId}`, { method: 'PUT', body: data }),
  deleteSubject: (semesterId, subjectId) => request(`/subjects/${semesterId}/subjects/${subjectId}`, { method: 'DELETE' }),
  reorderSubjects: (semesterId, subjectIds) => request(`/subjects/${semesterId}/subjects/reorder`, { method: 'POST', body: { subjectIds } }),
  
  addChapter: (semesterId, subjectId, chapterName, importanceLevel) => request(`/subjects/${semesterId}/subjects/${subjectId}/chapters`, { method: 'POST', body: { chapterName, importanceLevel } }),
  updateChapter: (semesterId, subjectId, chapterId, data) => request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/${chapterId}`, { method: 'PUT', body: data }),
  deleteChapter: (semesterId, subjectId, chapterId) => request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/${chapterId}`, { method: 'DELETE' }),
  reorderChapters: (semesterId, subjectId, chapterIds) => request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/reorder`, { method: 'POST', body: { chapterIds } }),
  
  addTopic: (semesterId, subjectId, chapterId, formData) => {
    return request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/${chapterId}/topics`, { method: 'POST', formData });
  },
  updateTopic: (semesterId, subjectId, chapterId, topicId, formData) => {
    return request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/${chapterId}/topics/${topicId}`, { method: 'PUT', formData });
  },
  deleteTopic: (semesterId, subjectId, chapterId, topicId) => request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/${chapterId}/topics/${topicId}`, { method: 'DELETE' }),
  reorderTopics: (semesterId, subjectId, chapterId, topicIds) => request(`/subjects/${semesterId}/subjects/${subjectId}/chapters/${chapterId}/topics/reorder`, { method: 'POST', body: { topicIds } }),

  // Learning (Student)
  getAllSemestersForStudent: () => request('/learning/semesters'),
  getCoordinatorSubjects: (coordinatorId) => request(`/learning/coordinator/${coordinatorId}/subjects`),
  getSubjectDetails: (semesterId, subjectId) => request(`/learning/semester/${semesterId}/subject/${subjectId}`),
  startVideoTracking: (topicId, semesterId, subjectId, chapterId, coordinatorId) =>
    request(`/learning/topic/${topicId}/start`, {
      method: 'POST',
      body: { semesterId, subjectId, chapterId, coordinatorId }
    }),
  updateTopicProgress: (semesterId, subjectId, chapterId, topicId, videoWatchedSeconds, coordinatorId) => 
    request(`/learning/semester/${semesterId}/subject/${subjectId}/chapter/${chapterId}/topic/${topicId}/progress`, { 
      method: 'POST', 
      body: { videoWatchedSeconds, coordinatorId } 
    }),
  getTopicProgress: (topicId) => request(`/learning/topic/${topicId}/progress`),
  getSubjectProgress: (subjectId) => request(`/learning/subject/${subjectId}/progress`),
  getStudentProgress: () => request('/learning/progress'),
  
  // Activity Tracking
  getActivities: (queryString) => request(`/activity${queryString ? '?' + queryString : ''}`),
  getActivityStats: () => request('/activity/stats'),
  logActivity: ({ actionType, targetType, targetId, description, changes, metadata }) => 
    request('/activity', { 
      method: 'POST', 
      body: { actionType, targetType, targetId, description, changes, metadata } 
    }),
};
