import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { motion } from 'framer-motion';
import ContributionCalendar from '../components/ContributionCalendar';

export default function StudentProfile() {
  const [user, setUser] = useState(null);
  // Editing of text fields is disabled per requirements
  const [form, setForm] = useState({ name: '', course: '', branch: '', college: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activity, setActivity] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    (async () => {
      setError('');
      try {
        const me = await api.me();
        setUser(me);
        setForm({
          name: me.name || '',
          course: me.course || '',
          branch: me.branch || '',
          college: me.college || ''
        });
      } catch (e) {
        setError(e.message || 'Failed to load profile');
      }
    })();
  }, []);

  useEffect(() => {
    // Load activity data for selected year
    loadActivityData(selectedYear);
  }, [selectedYear]);

  const loadActivityData = async (year) => {
    setLoadingActivity(true);
    try {
      const data = await api.getStudentActivity(year);
      setActivity(data.activityByDate || {});
      setAvailableYears(data.availableYears || []);
      setActivityStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load activity:', e);
      // Fall back to empty activity
      setActivity({});
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
  };

  const onUploadAvatar = async () => {
    if (!avatarFile) return;
    setAvatarUploading(true); setError(''); setSuccess('');
    try {
      const res = await api.updateMyAvatar(avatarFile);
      setSuccess('Profile picture updated');
      // Refresh
      const me = await api.me();
      setUser(me);
      setAvatarFile(null);
    } catch (e) {
      setError(e.message || 'Failed to upload');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Text fields are read-only; only avatar can be updated

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
        <div className="w-full max-w-3xl mx-auto px-4 py-12">
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pt-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full px-6 py-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4 mb-6">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-2xl border border-slate-200">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <label className="text-xs text-slate-500">Profile Picture</label>
              <div className="flex items-center gap-3 mt-1">
                <input type="file" accept="image/*" onChange={onAvatarChange} className="text-sm" />
                <button onClick={onUploadAvatar} disabled={avatarUploading || !avatarFile} className="px-3 py-2 text-sm rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60">
                  {avatarUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">My Profile</h2>
              <p className="text-slate-600 text-sm">Information uploaded by admin is visible by default. You can only update your profile picture.</p>
            </div>
          </div>

          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mb-3 text-sm text-emerald-600">{success}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500">Name</label>
              <div className="mt-1 text-slate-800">{user.name || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Student ID</label>
              <div className="mt-1 text-slate-800">{user.studentId || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Email</label>
              <div className="mt-1 text-slate-800">{user.email || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Course</label>
              <div className="mt-1 text-slate-800">{user.course || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Branch</label>
              <div className="mt-1 text-slate-800">{user.branch || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Semester</label>
              <div className="mt-1 text-slate-800">{user.semester || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">College</label>
              <div className="mt-1 text-slate-800">{user.college || '-'}</div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Coordinator Assigned</label>
              <div className="mt-1 text-slate-800">{user.teacherId || 'Not Assigned'}</div>
            </div>
          </div>

            {/* No text field editing allowed */}

            {/* Contribution Calendar on white background with blue intensity */}
            <div className="mt-8 rounded-lg p-4 border border-slate-200 bg-white">
              {loadingActivity ? (
                <div className="text-center py-8 text-slate-500">Loading activity...</div>
              ) : (
                <ContributionCalendar 
                  activityByDate={activity} 
                  title="Contribution Calendar"
                  year={selectedYear}
                  availableYears={availableYears}
                  onYearChange={handleYearChange}
                  showYearFilter={true}
                  stats={activityStats}
                />
              )}
            </div>
        </div>
      </motion.div>
    </div>
  );
}
