import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import { Users, Calendar, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CoordinatorDashboard() {
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, eventsData] = await Promise.all([
        api.listAllStudents(),
        api.listEvents()
      ]);
      setStudents(studentsData.students || []);
      setEvents(eventsData.events || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    searchQuery === '' ||
    (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold text-slate-900">Coordinator Dashboard</h1>
          <p className="text-slate-600 mt-2">Manage your assigned students and create interview events</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Assigned Students</p>
                <p className="text-2xl font-bold text-slate-900">{students.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-600 text-sm">Active Events</p>
                <p className="text-2xl font-bold text-slate-900">{events.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate('/coordinator/event/create')}
            className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl shadow-sm p-6 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/90 text-sm">Create New</p>
                <p className="text-xl font-bold text-white">Interview Event</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Students Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">My Students</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No students match your search' : 'No students assigned yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Student ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Branch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student) => (
                    <tr key={student._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{student.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.studentId}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.branch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Events Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">My Events</h2>
            <button
              onClick={() => navigate('/coordinator/event/create')}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No events created yet</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <motion.div
                  key={event._id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(`/coordinator/event/${event._id}`)}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <h3 className="font-semibold text-slate-900 mb-2">{event.name}</h3>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{event.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{event.participants?.length || 0} participants</span>
                    <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
