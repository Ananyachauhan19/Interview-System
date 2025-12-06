import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../utils/api';
import { 
  Calendar, Users, ArrowLeft, Download, Clock, 
  CheckCircle, XCircle, AlertCircle, FileText, Mail,
  UserCheck, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function CoordinatorEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [pairs, setPairs] = useState([]);

  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const [eventData, analyticsData, pairsData] = await Promise.all([
        api.getEvent(id),
        api.getEventAnalytics(id),
        api.listPairs(id)
      ]);
      setEvent(eventData);
      setAnalytics(analyticsData);
      setPairs(pairsData || []);
    } catch (err) {
      console.error('Failed to load event:', err);
      setError(err.message || 'Failed to load event details');
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadParticipants = async () => {
    try {
      const blob = await api.exportParticipantsCsv(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.name || 'event'}_participants.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Participants CSV downloaded');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download participants');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
          >
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Event</h2>
            <p className="text-red-700 mb-4">{error || 'Event not found'}</p>
            <button
              onClick={() => navigate('/coordinator/dashboard')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const participants = event?.participants || [];
  const joinedCount = analytics?.joined || 0;
  const pairedCount = analytics?.pairs || 0;

  return (
    <div className="min-h-screen py-8 px-4 bg-slate-50">
      <div className="max-w-7xl mx-auto mt-16">
        {/* Back Button */}
        <button
          onClick={() => navigate('/coordinator/dashboard')}
          className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* Event Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{event.name}</h1>
                  <p className="text-slate-500 text-sm">Event ID: {event._id}</p>
                </div>
              </div>
              {event.description && (
                <p className="text-slate-600 mt-4">{event.description}</p>
              )}
            </div>
            <button
              onClick={loadEventData}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Event Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Start Date</p>
                <p className="text-sm font-semibold text-slate-800">{formatDate(event.startDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">End Date</p>
                <p className="text-sm font-semibold text-slate-800">{formatDate(event.endDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <UserCheck className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Participants Joined</p>
                <p className="text-sm font-semibold text-slate-800">{joinedCount} / {participants.length}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Users className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Pairs Created</p>
                <p className="text-sm font-semibold text-slate-800">{pairedCount}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDownloadParticipants}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Participants
            </button>
          </div>
        </motion.div>

        {/* Participants Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Participants ({participants.length})
            </h2>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No participants yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {participants.map((participant, index) => (
                    <tr key={participant._id || index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{participant.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{participant.email || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Pairs Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-emerald-600" />
              Interview Pairs ({pairs.length})
            </h2>
          </div>

          {pairs.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No pairs created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pairs.map((pair, index) => (
                <motion.div
                  key={pair._id || index}
                  whileHover={{ scale: 1.02 }}
                  className="border border-slate-200 rounded-lg p-4 hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800">Pair {index + 1}</h3>
                    {pair.scheduledAt ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Scheduled</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Not Scheduled</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-emerald-700">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{pair.student1?.name || 'Student 1'}</p>
                        <p className="text-xs text-slate-500">{pair.student1?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-sky-700">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{pair.student2?.name || 'Student 2'}</p>
                        <p className="text-xs text-slate-500">{pair.student2?.email || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  {pair.scheduledAt && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(pair.scheduledAt)}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
