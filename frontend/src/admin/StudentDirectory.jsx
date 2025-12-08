/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Loader2, X } from "lucide-react";
import Fuse from "fuse.js";
import ContributionCalendar from "../components/ContributionCalendar";

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [specialStudents, setSpecialStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("students"); // "students" or "special"
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activity, setActivity] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Configure Fuse.js for optimized fuzzy search
  const currentStudents = activeTab === "students" ? students : specialStudents;
  
  const fuse = useMemo(() => {
    return new Fuse(currentStudents, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'studentId', weight: 2 },
        { name: 'email', weight: 1.5 },
        { name: 'branch', weight: 1 },
        { name: 'course', weight: 1 },
        { name: 'college', weight: 0.8 }
      ],
      threshold: 0.4, // More forgiving for variations like B.Tech vs btech
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      useExtendedSearch: true,
      // Case insensitive and removes special characters for matching
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        if (typeof value === 'string') {
          // Normalize: lowercase, remove dots, spaces, and special chars
          return value.toLowerCase().replace(/[.\s-]/g, '');
        }
        return value;
      }
    });
  }, [currentStudents]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    // Use Fuse.js for optimized fuzzy search
    if (!searchQuery.trim()) {
      setFilteredStudents(currentStudents);
    } else {
      // Normalize search query to match getFn normalization
      const normalizedQuery = searchQuery.toLowerCase().replace(/[.\s-]/g, '');
      const results = fuse.search(normalizedQuery);
      // Extract the items from Fuse results
      const filtered = results.map(result => result.item);
      setFilteredStudents(filtered);
    }
  }, [searchQuery, currentStudents, fuse]);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    setSearchQuery(""); // Clear search when switching tabs
    try {
      if (activeTab === "students") {
        const data = await api.listAllStudents();
        setStudents(data.students || []);
        setFilteredStudents(data.students || []);
      } else {
        const data = await api.listAllSpecialStudents();
        setSpecialStudents(data.students || []);
        setFilteredStudents(data.students || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    // Search is now handled by the useEffect with Fuse.js
    // No need for server-side search since we have all students loaded
  };

  const clearSearch = () => {
    setSearchQuery("");
    loadData();
  };

  const openStudentProfile = async (student) => {
    setSelectedStudent(student);
    setShowModal(true);
    setSelectedYear(new Date().getFullYear());
    
    // Load real activity data for current year
    await loadStudentActivity(student._id, new Date().getFullYear());
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
      // Fall back to empty activity
      setActivity({});
      setAvailableYears([]);
      setActivityStats(null);
    } finally {
      setLoadingActivity(false);
    }
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
      setSelectedYear(new Date().getFullYear());
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full max-w-7xl mx-auto px-4 py-6"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "students"
                  ? "border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab("special")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "special"
                  ? "border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"
              }`}
            >
              Special Students
            </button>
          </div>
          
          {/* Header Section with Search */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                activeTab === "students" ? "bg-emerald-100 dark:bg-emerald-900" : "bg-indigo-100 dark:bg-indigo-900"
              }`}>
                <Users className={`w-6 h-6 ${
                  activeTab === "students" ? "text-emerald-600" : "text-indigo-600"
                }`} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-gray-100">
                  {activeTab === "students" ? "Student Database" : "Special Event Students"}
                </h2>
                <p className="text-slate-600 dark:text-gray-400 text-sm">
                  {activeTab === "students" 
                    ? "View and search all registered students" 
                    : "View students from special events"}
                </p>
              </div>
            </div>

            {/* Compact Search Bar */}
            <form onSubmit={handleSearch} className="w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 text-slate-700 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-gray-600 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-500" />
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
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  Total {activeTab === "students" ? "Students" : "Special Students"}: <span className={`font-semibold ${
                    activeTab === "students" ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                  }`}>{currentStudents.length}</span>
                </span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-gray-400">
                    Showing: <span className="font-semibold text-slate-800 dark:text-gray-200">{filteredStudents.length}</span> results
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
              className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
              <p className="text-slate-600 dark:text-gray-400">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-2">No students found</h3>
              <p className="text-slate-500 dark:text-gray-400 text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No students have been registered yet"}
              </p>
            </div>
          ) : (
            // Students Table (no tabs, clear and scannable)
            <div>
              <div className="mb-3 px-2">
                <p className="text-sm text-slate-600 dark:text-gray-400 flex items-center gap-2">
                  <span className="font-medium text-sky-600">💡 Tip:</span>
                  Click on a student's name to view their detailed profile
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-gray-300">Student</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Email</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Branch</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Course</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Semester</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">College</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Coordinator Assigned</th>
                    
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {filteredStudents.map((s) => {
                    const initial = s.name?.charAt(0)?.toUpperCase() || "?";
                    return (
                      <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            {s.avatarUrl ? (
                              <img 
                                src={s.avatarUrl} 
                                alt={s.name} 
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                                activeTab === "students" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"
                              }`}>
                                {initial}
                              </div>
                            )}
                            <div className="max-w-[280px]">
                              <button
                                onClick={() => openStudentProfile(s)}
                                className="font-medium text-slate-900 dark:text-gray-100 hover:text-sky-600 dark:hover:text-sky-400 truncate text-sm transition-colors text-left"
                              >
                                {s.name || "Unknown"}
                              </button>
                              <div className="text-xs text-slate-500 dark:text-gray-400 truncate">{s.studentId || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-gray-300 max-w-[260px] text-sm"><span className="truncate block">{s.email || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 dark:text-gray-300 text-sm">{s.branch || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm">{s.course || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm">{s.semester || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm max-w-[200px]"><span className="truncate block">{s.college || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 dark:text-gray-300 text-sm">{s.teacherId || "-"}</td>
                        
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50"
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
                    <X className="w-5 h-5 text-slate-600" />
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
                          <div className="mt-1 text-slate-800 dark:text-gray-200 font-medium">{selectedStudent.name || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Student ID</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-200 font-medium">{selectedStudent.studentId || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Email</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-200">{selectedStudent.email || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Course</label>
                          <div className="mt-1 text-slate-800 dark:text-gray-200 font-medium">{selectedStudent.course || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-gray-400">Branch</label>
                          <div className="mt-1 text-slate-800 font-medium">{selectedStudent.branch || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Semester</label>
                          <div className="mt-1 text-slate-800">{selectedStudent.semester || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* College Information */}
                    <div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500">College</label>
                          <div className="mt-1 text-slate-800">{selectedStudent.college || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Information */}
                    <div>
             
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500">Coordinator Assigned</label>
                          <div className="mt-1 text-slate-800">{selectedStudent.teacherId || "Not Assigned"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info for Special Students */}
                  {activeTab === "special" && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Special Event Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudent.eventId && (
                          <div>
                            <label className="text-xs text-slate-500">Event ID</label>
                            <div className="mt-1 text-slate-800">{selectedStudent.eventId}</div>
                          </div>
                        )}
                        {selectedStudent.semester && (
                          <div>
                            <label className="text-xs text-slate-500">Event Semester</label>
                            <div className="mt-1 text-slate-800">{selectedStudent.semester}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contribution Calendar */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="rounded-lg p-4 bg-slate-50 border border-slate-200">
                      {loadingActivity ? (
                        <div className="text-center py-8 text-slate-500">Loading activity...</div>
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
                <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Close
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
