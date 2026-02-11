/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Loader2, X } from "lucide-react";
import Fuse from "fuse.js";
import ContributionCalendar from "../components/ContributionCalendar";

export default function CoordinatorStudents() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activity, setActivity] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // State for detailed videos/courses modals and stats
  const [studentStats, setStudentStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showVideosModal, setShowVideosModal] = useState(false);
  const [showCoursesModal, setShowCoursesModal] = useState(false);
  const [videosWatched, setVideosWatched] = useState([]);
  const [coursesEnrolled, setCoursesEnrolled] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Configure Fuse.js for optimized fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(students, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'studentId', weight: 2 },
        { name: 'email', weight: 1.5 },
        { name: 'branch', weight: 1 },
        { name: 'course', weight: 1 },
        { name: 'college', weight: 0.8 }
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        if (typeof value === 'string') {
          return value.toLowerCase().replace(/[.\s-]/g, '');
        }
        return value;
      }
    });
  }, [students]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
    } else {
      const normalizedQuery = searchQuery.toLowerCase().replace(/[.\s-]/g, '');
      const results = fuse.search(normalizedQuery);
      const filtered = results.map(result => result.item);
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students, fuse]);

  const fetchStudents = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.listAllStudents();
      setStudents(data.students || []);
      setFilteredStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Failed to load students");
      console.error("Error fetching students:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
  };

  const clearSearch = () => {
    setSearchQuery("");
    fetchStudents();
  };

  const openStudentProfile = async (student) => {
    setSelectedStudent(student);
    setShowModal(true);
    setSelectedYear(new Date().getFullYear());
    
    // Load real activity data for current year and stats
    await loadStudentActivity(student._id, new Date().getFullYear());
    await loadStudentStats(student._id);
  };

  const loadStudentActivity = async (studentId, year) => {
    setLoadingActivity(true);
    try {
      const data = await api.getStudentActivityByAdmin(studentId, year);
      setActivity(data.activityByDate || {});
      setAvailableYears(data.availableYears || []);
      setActivityStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load student activity:', e);
      setActivity({});
      setAvailableYears([]);
      setActivityStats(null);
    } finally {
      setLoadingActivity(false);
    }
  };

  const loadStudentStats = async (studentId) => {
    setLoadingStats(true);
    try {
      const data = await api.getStudentStatsByAdmin(studentId);
      setStudentStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load student stats:', e);
      setStudentStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleShowVideosWatched = async () => {
    if (!selectedStudent) return;
    
    setShowVideosModal(true);
    setLoadingVideos(true);
    try {
      const data = await api.getStudentVideosWatchedByAdmin(selectedStudent._id);
      setVideosWatched(data.videos || []);
    } catch (e) {
      console.error('Failed to load videos watched:', e);
      setVideosWatched([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleShowCoursesEnrolled = async () => {
    if (!selectedStudent) return;
    
    setShowCoursesModal(true);
    setLoadingCourses(true);
    try {
      const data = await api.getStudentCoursesEnrolledByAdmin(selectedStudent._id);
      setCoursesEnrolled(data.courses || []);
    } catch (e) {
      console.error('Failed to load courses enrolled:', e);
      setCoursesEnrolled([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const closeVideosModal = () => {
    setShowVideosModal(false);
    setVideosWatched([]);
  };

  const closeCoursesModal = () => {
    setShowCoursesModal(false);
    setCoursesEnrolled([]);
  };

  const handleYearChange = async (year) => {
    setSelectedYear(year);
    if (selectedStudent && selectedStudent._id) {
      await loadStudentActivity(selectedStudent._id, year);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedStudent(null);
      setActivity({});
      setAvailableYears([]);
      setActivityStats(null);
      setStudentStats(null);
      setSelectedYear(new Date().getFullYear());
      setVideosWatched([]);
      setCoursesEnrolled([]);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full max-w-7xl mx-auto px-4 py-6"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          {/* Header Section with Search */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-900">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-gray-100">
                  My Students
                </h2>
                <p className="text-slate-600 dark:text-gray-400 text-sm">
                  View and manage students assigned to you
                </p>
              </div>
            </div>

            {/* Compact Search Bar */}
            <form onSubmit={handleSearch} className="w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 text-slate-700 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 ml-1">
                Search by name, ID, email, branch, course, or college
              </p>
            </form>
          </div>

          {/* Stats */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600 dark:text-gray-300" />
                <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                  Total Students: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{students.length}</span>
                </span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-gray-300">
                    Showing: <span className="font-semibold text-slate-800 dark:text-gray-100">{filteredStudents.length}</span> results
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-spin mb-4" />
              <p className="text-slate-600 dark:text-gray-400">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-2">No students found</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No students have been assigned to you yet"}
              </p>
            </div>
          ) : (
            // Students Table
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-700">
                <thead className="bg-slate-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Student</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Email</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Branch</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Course</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Semester</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Group</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">College</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Coordinator Assigned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredStudents.map((s) => {
                    const initial = s.name?.charAt(0)?.toUpperCase() || "?";
                    return (
                      <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => openStudentProfile(s)}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            {s.avatarUrl ? (
                              <img
                                src={s.avatarUrl}
                                alt={s.name || initial}
                                className="w-8 h-8 rounded-full object-cover border border-sky-200 dark:border-sky-700"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300">
                                {initial}
                              </div>
                            )}
                            <div className="max-w-[280px]">
                              <button onClick={() => openStudentProfile(s)} className="font-medium text-emerald-600 dark:text-emerald-400 truncate text-sm hover:underline text-left">{s.name || "Unknown"}</button>
                              <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{s.studentId || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-gray-300 max-w-[260px] text-sm"><span className="truncate block">{s.email || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 dark:text-gray-300 text-sm">{s.branch || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm">{s.course || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm">{s.semester || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm">{s.group || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm max-w-[200px]"><span className="truncate block">{s.college || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 dark:text-gray-300 text-sm">{s.teacherId || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Student Profile Modal */}
      <AnimatePresence>
        {showModal && selectedStudent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={closeModal}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-700 dark:to-gray-700 border-b border-slate-200 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {selectedStudent.avatarUrl ? (
                      <img 
                        src={selectedStudent.avatarUrl} 
                        alt={selectedStudent.name} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-2xl border-2 border-white shadow-md">
                        {selectedStudent.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-gray-100">{selectedStudent.name || "Unknown"}</h3>
                      <p className="text-sm text-slate-600 dark:text-gray-400">{selectedStudent.studentId || "N/A"}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Name</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100 font-medium">{selectedStudent.name || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Student ID</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100 font-medium">{selectedStudent.studentId || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Email</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100">{selectedStudent.email || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Course</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100 font-medium">{selectedStudent.course || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Branch</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100 font-medium">{selectedStudent.branch || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Semester</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100">{selectedStudent.semester || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Group</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100">{selectedStudent.group || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* College Information */}
                    <div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">College</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100">{selectedStudent.college || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Information */}
                    <div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Coordinator Assigned</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-100">{selectedStudent.teacherId || "Not Assigned"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics Section */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
                    <h4 className="font-medium text-slate-800 dark:text-gray-100 mb-4">Statistics</h4>
                    {loadingStats ? (
                      <div className="text-center py-4 text-slate-500 dark:text-gray-400">Loading stats...</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleShowCoursesEnrolled}
                          className="text-left p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">{studentStats?.totalCoursesEnrolled || 0}</div>
                          <div className="text-sm text-slate-500 dark:text-gray-400">Courses Enrolled</div>
                        </button>
                        <button
                          onClick={handleShowVideosWatched}
                          className="text-left p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-slate-800 dark:text-gray-100">{studentStats?.totalVideosWatched || 0}</div>
                          <div className="text-sm text-slate-500 dark:text-gray-400">Videos Watched</div>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contribution Calendar */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-700">
                    <div className="rounded-lg p-4 bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600">
                      {loadingActivity ? (
                        <div className="text-center py-8 text-slate-500 dark:text-gray-400">Loading activity...</div>
                      ) : (
                        <ContributionCalendar 
                          activityByDate={activity} 
                          title="Student Activity"
                          year={selectedYear}
                          availableYears={availableYears}
                          onYearChange={handleYearChange}
                          showYearFilter={true}
                          stats={activityStats}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 px-6 py-4 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 dark:bg-slate-600 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-500 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Videos Watched Modal */}
      <AnimatePresence>
        {showVideosModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={closeVideosModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">Videos Watched</h3>
                  <button
                    onClick={closeVideosModal}
                    className="text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[60vh] p-6">
                  {videosWatched.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-gray-400">No videos watched yet</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-gray-300">Video Title</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-gray-300">Subject</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-gray-300">Watched On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {videosWatched.map((video, index) => (
                          <tr key={index} className="border-b border-slate-100 dark:border-gray-700">
                            <td className="py-3 px-4 text-slate-800 dark:text-gray-100">{video.videoTitle || 'Unknown Video'}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-gray-300">{video.subjectName || 'Unknown Subject'}</td>
                            <td className="py-3 px-4 text-slate-600 dark:text-gray-300">
                              {video.watchedDate ? `${new Date(video.watchedDate).toLocaleDateString()} at ${new Date(video.watchedDate).toLocaleTimeString()}` : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Courses Enrolled Modal */}
      <AnimatePresence>
        {showCoursesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={closeCoursesModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">Courses Enrolled</h3>
                  <button
                    onClick={closeCoursesModal}
                    className="text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[60vh] p-6">
                  {coursesEnrolled.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-gray-400">No courses enrolled yet</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-gray-300">Course Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-gray-300">Progress</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-gray-300">Enrolled On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coursesEnrolled.map((course, index) => (
                          <tr key={index} className="border-b border-slate-100 dark:border-gray-700">
                            <td className="py-3 px-4 text-slate-800 dark:text-gray-100">{course.courseName || 'Unknown Course'}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 rounded-full" 
                                    style={{ width: `${course.progressPercentage || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm text-slate-600 dark:text-gray-300">{course.progressPercentage || 0}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-gray-300">
                              {course.enrollmentDate ? new Date(course.enrollmentDate).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
