import { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import ContributionCalendar from '../components/ContributionCalendar';
import { FiCamera, FiX, FiMail, FiUser, FiBook, FiGitBranch, FiMapPin, FiHash, FiUserCheck } from 'react-icons/fi';

export default function StudentProfile() {
  const [user, setUser] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activity, setActivity] = useState({});
  const [activityStats, setActivityStats] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
      } catch (e) {
        setError(e.message || 'Failed to load profile');
      }
    })();
  }, []);

  useEffect(() => {
    // Load activity data immediately
    loadActivityData();
    
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow - now;
    
    // Set timeout to refresh at midnight
    const midnightTimeout = setTimeout(() => {
      loadActivityData();
      
      // Set up daily interval after first midnight refresh
      const dailyInterval = setInterval(() => {
        loadActivityData();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimeout);
  }, []);

  const loadActivityData = async () => {
    setLoadingActivity(true);
    try {
      const data = await api.getStudentActivity();
      setActivity(data.activityByDate || {});
      setActivityStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load activity:', e);
      setActivity({});
    } finally {
      setLoadingActivity(false);
    }
  };

  const onAvatarChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    
    // Create preview
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const openPhotoModal = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setError('');
    setSuccess('');
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setError('');
    setSuccess('');
  };

  const handleUpdatePhoto = async () => {
    if (!avatarFile) {
      setError('Please select a photo first');
      return;
    }

    setError('');
    setSuccess('');
    
    try {
      await api.updateMyAvatar(avatarFile);
      
      // Refresh user data
      const me = await api.me();
      setUser(me);
      
      setSuccess('Profile photo updated successfully!');
      setTimeout(() => {
        closePhotoModal();
      }, 1500);
    } catch (e) {
      setError(e.message || 'Failed to update photo');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col pt-16">
        <div className="w-full max-w-3xl mx-auto px-4 py-12">
          <p className="text-slate-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col pt-16">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="w-full px-4 sm:px-6 py-8"
      >
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden mb-6">
          {/* Header Banner */}
          <div className="h-32 relative" style={{ backgroundColor: 'rgb(135, 206, 235)' }}>
            <div className="absolute -bottom-16 left-8">
              <div className="relative">
                {user.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.name} 
                    className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl border-4 border-white dark:border-gray-800 shadow-lg">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <button
                  onClick={openPhotoModal}
                  className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-full p-2.5 shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white dark:border-gray-800"
                  title="Edit Photo"
                >
                  <FiCamera className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 px-8 pb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
              {user.name || 'Student Name'}
            </h1>
            <p className="text-slate-600 dark:text-gray-300 mb-6 flex items-center gap-2">
              <FiHash className="w-4 h-4" />
              {user.studentId || 'Student ID'}
            </p>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                <FiMail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm text-slate-800 dark:text-white font-medium truncate">{user.email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                <FiBook className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">Course</p>
                  <p className="text-sm text-slate-800 dark:text-white font-medium">{user.course || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                <FiGitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">Branch</p>
                  <p className="text-sm text-slate-800 dark:text-white font-medium">{user.branch || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                <FiMapPin className="w-5 h-5 text-pink-600 dark:text-pink-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">College</p>
                  <p className="text-sm text-slate-800 dark:text-white font-medium">{user.college || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                <FiBook className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">Semester</p>
                  <p className="text-sm text-slate-800 dark:text-white font-medium">{user.semester || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                <FiUserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-1">Coordinator</p>
                  <p className="text-sm text-slate-800 dark:text-white font-medium">{user.teacherId || 'Not Assigned'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contribution Calendar Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 p-6">
          {loadingActivity ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-500 dark:text-gray-400 mt-4">Loading activity...</p>
            </div>
          ) : (
            <ContributionCalendar 
              activity={activity}
              stats={activityStats}
              title="Contribution Calendar"
            />
          )}
        </div>
      </motion.div>

      {/* Edit Photo Modal */}
      <AnimatePresence>
        {showPhotoModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePhotoModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiCamera className="w-5 h-5" />
                    Edit Photo
                  </h2>
                  <button
                    onClick={closePhotoModal}
                    className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-400 text-sm"
                    >
                      {success}
                    </motion.div>
                  )}

                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      {avatarPreview ? (
                        <img 
                          src={avatarPreview} 
                          alt="Preview" 
                          className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                        />
                      ) : user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name} 
                          className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-gray-600 shadow-lg"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-4xl border-4 border-slate-200 dark:border-gray-600 shadow-lg">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg cursor-pointer transition-colors">
                        <FiCamera className="w-5 h-5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={onAvatarChange} 
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-300 mb-2 text-center">
                      {avatarFile ? avatarFile.name : 'Click the camera icon to select a new photo'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 text-center">
                      Recommended: Square image, at least 256x256px
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50 dark:bg-gray-900 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-200 dark:border-gray-700">
                  <button
                    onClick={closePhotoModal}
                    className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePhoto}
                    disabled={!avatarFile}
                    className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update Photo
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
