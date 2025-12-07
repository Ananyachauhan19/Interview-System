import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, BookOpen, Users, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function AdminLearning() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const navigate = useNavigate();

  // Modal states
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const data = await api.getAllSemestersForStudent();
      setSemesters(data);
    } catch (error) {
      console.error('Error loading semesters:', error);
      toast.error('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  const toggleSemester = (semesterName) => {
    setExpandedSemesters(prev => ({
      ...prev,
      [semesterName]: !prev[semesterName]
    }));
  };

  const toggleSubject = (subjectKey) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectKey]: !prev[subjectKey]
    }));
  };

  const handleTeacherClick = (semesterName, subjectName, coordinator) => {
    navigate(`/admin/learning/${encodeURIComponent(semesterName)}/${encodeURIComponent(subjectName)}/${coordinator.coordinatorId}`, {
      state: {
        semesterId: coordinator.semesterId,
        subjectId: coordinator.subjectId,
        coordinatorName: coordinator.coordinatorName,
        coordinatorId: coordinator.coordinatorId
      }
    });
  };

  const openCreateSemesterModal = () => {
    setEditingSemester(null);
    setShowSemesterModal(true);
  };

  const openCreateSubjectModal = (semester) => {
    setSelectedSemester(semester);
    setEditingSubject(null);
    setShowSubjectModal(true);
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const semesterName = formData.get('semesterName');
    const semesterDescription = formData.get('semesterDescription');

    try {
      await api.createSemester(semesterName, semesterDescription);
      toast.success('Semester created successfully');
      setShowSemesterModal(false);
      loadSemesters();
    } catch (error) {
      console.error('Error creating semester:', error);
      toast.error('Failed to create semester');
    }
  };

  const handleDeleteSemester = async (semesterId) => {
    if (!confirm('Are you sure you want to delete this semester? All subjects, chapters, and topics will be deleted.')) {
      return;
    }

    try {
      await api.deleteSemester(semesterId);
      toast.success('Semester deleted successfully');
      loadSemesters();
    } catch (error) {
      console.error('Error deleting semester:', error);
      toast.error('Failed to delete semester');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-20 px-4 pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Learning Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all courses, semesters, and content
            </p>
          </div>
        </motion.div>

        {/* Semesters Grid */}
        {semesters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center"
          >
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No courses available yet</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {semesters.map((semester, idx) => (
              <motion.div
                key={semester.semesterName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Semester Header */}
                <div className="flex items-center justify-between p-6">
                  <div
                    onClick={() => toggleSemester(semester.semesterName)}
                    className="flex items-center space-x-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1 -m-2 p-2 rounded"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {semester.semesterName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {semester.semesterName}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {semester.subjects.length} {semester.subjects.length === 1 ? 'subject' : 'subjects'}
                      </p>
                    </div>
                    {expandedSemesters[semester.semesterName] ? (
                      <ChevronDown className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Subjects List */}
                <AnimatePresence>
                  {expandedSemesters[semester.semesterName] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <div className="p-6 space-y-3">
                        {semester.subjects.map((subject) => {
                          const subjectKey = `${semester.semesterName}-${subject.subjectName}`;
                          return (
                            <div
                              key={subjectKey}
                              className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden"
                            >
                              {/* Subject Header */}
                              <div className="flex items-center justify-between p-4">
                                <div
                                  onClick={() => toggleSubject(subjectKey)}
                                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex-1 -m-2 p-2 rounded"
                                >
                                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                  <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                      {subject.subjectName}
                                    </h3>
                                    {subject.subjectDescription && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {subject.subjectDescription}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {subject.coordinators.length} {subject.coordinators.length === 1 ? 'teacher' : 'teachers'}
                                    </span>
                                    {expandedSubjects[subjectKey] ? (
                                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Teachers List */}
                              <AnimatePresence>
                                {expandedSubjects[subjectKey] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="p-4 space-y-2">
                                      {subject.coordinators.map((coordinator) => (
                                        <motion.button
                                          key={coordinator.coordinatorId}
                                          whileHover={{ scale: 1.02 }}
                                          whileTap={{ scale: 0.98 }}
                                          onClick={() => handleTeacherClick(semester.semesterName, subject.subjectName, coordinator)}
                                          className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900 hover:border-indigo-300 dark:hover:border-indigo-600 border border-gray-200 dark:border-gray-600 transition-all"
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                              {coordinator.coordinatorName?.charAt(0) || 'T'}
                                            </div>
                                            <div className="text-left">
                                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                                {coordinator.coordinatorName || 'Teacher'}
                                              </p>
                                            </div>
                                          </div>
                                          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                        </motion.button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Semester Modal */}
      <AnimatePresence>
        {showSemesterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowSemesterModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
            >
              <form onSubmit={handleCreateSemester}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Create New Semester
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Semester Name
                    </label>
                    <input
                      type="text"
                      name="semesterName"
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="e.g., Semester 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      name="semesterDescription"
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSemesterModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
