/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Loader2, X, Trash2, Edit2, Save, Download } from "lucide-react";
import Fuse from "fuse.js";
import ContributionCalendar from "../components/ContributionCalendar";
import { useToast } from "../components/CustomToast";

export default function StudentDirectory() {
  const toast = useToast();
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
  const [activityStats, setActivityStats] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [studentStats, setStudentStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [eventsStudent, setEventsStudent] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [isExporting, setIsExporting] = useState(false);

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
  }, [activeTab, sortOrder]);

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
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, currentStudents, fuse]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    setSearchQuery(""); // Clear search when switching tabs
    try {
      if (activeTab === "students") {
        const data = await api.listAllStudents('', sortOrder);
        setStudents(data.students || []);
        setFilteredStudents(data.students || []);
      } else {
        const data = await api.listAllSpecialStudents('', sortOrder);
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
    
    // Load real activity data and stats
    await loadStudentActivity(student._id);
    await loadStudentStats(student._id);
  };

  const loadStudentActivity = async (studentId) => {
    setLoadingActivity(true);
    try {
      const data = await api.getStudentActivityByAdmin(studentId);
      setActivity(data.activityByDate || {});
      setActivityStats(data.stats || null);
    } catch (e) {
      console.error('Failed to load student activity:', e);
      // Fall back to empty activity
      setActivity({});
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

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedStudent(null);
      setActivity({});
      setActivityStats(null);
      setStudentStats(null);
    }, 300);
  };

  const handleDeleteStudent = async (student, e) => {
    e.stopPropagation(); // Prevent row click from opening profile
    
    if (!confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.deleteStudent(student._id);
      
      // Remove from local state
      if (activeTab === "students") {
        setStudents(prev => prev.filter(s => s._id !== student._id));
      } else {
        setSpecialStudents(prev => prev.filter(s => s._id !== student._id));
      }
      setFilteredStudents(prev => prev.filter(s => s._id !== student._id));
      
      // Show success message
      toast.success(`Student ${student.name} has been deleted successfully.`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete student');
    }
  };

  const handleEditStudent = (student, e) => {
    e.stopPropagation(); // Prevent row click from opening profile
    setEditingStudent(student);
    setEditForm({
      name: student.name || '',
      email: student.email || '',
      studentId: student.studentId || '',
      course: student.course || '',
      branch: student.branch || '',
      college: student.college || '',
      semester: student.semester || '',
      group: student.group || '',
      teacherId: student.teacherId || ''
    });
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    
    setIsSaving(true);
    try {
      const updated = await api.updateStudent(editingStudent._id, editForm);
      
      // Update local state
      const updateList = (list) => list.map(s => 
        s._id === editingStudent._id ? { ...s, ...editForm } : s
      );
      
      if (activeTab === "students") {
        setStudents(updateList);
      } else {
        setSpecialStudents(updateList);
      }
      setFilteredStudents(updateList);
      
      setEditingStudent(null);
      setEditForm({});
      toast.success(`Student ${editForm.name} updated successfully!`);
    } catch (err) {
      toast.error(err.message || 'Failed to update student');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingStudent(null);
    setEditForm({});
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await api.exportStudentsCsv();
      toast.success('Students exported successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to export students');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full mx-auto px-4 py-6"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 p-3 sm:p-4 lg:p-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "students"
                  ? "border-emerald-500 dark:border-emerald-400 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-slate-600 dark:text-white hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab("special")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "special"
                  ? "border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-slate-600 dark:text-white hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Special Students
            </button>
          </div>
          
          {/* Header Section with Search and Sort */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                activeTab === "students" ? "bg-emerald-100 dark:bg-emerald-900" : "bg-indigo-100 dark:bg-indigo-900"
              }`}>
                <Users className={`w-5 h-5 sm:w-6 sm:h-6 ${
                  activeTab === "students" ? "text-emerald-600" : "text-indigo-600"
                }`} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-800 dark:text-white">
                  {activeTab === "students" ? "Student Database" : "Special Event Students"}
                </h2>
                <p className="text-slate-600 dark:text-white text-xs sm:text-sm hidden sm:block">
                  {activeTab === "students" 
                    ? "View and search all registered students" 
                    : "View students from special events"}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Export CSV Button */}
              <button
                onClick={handleExportCsv}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-lg transition-colors"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>

              {/* Sort Order Dropdown */}
              <div className="flex flex-col">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 text-slate-700 dark:text-white bg-white dark:bg-gray-700 cursor-pointer"
                >
                  <option value="asc">Oldest First</option>
                  <option value="desc">Newest First</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-white mt-1 ml-1 hidden sm:block">
                  Sort by creation date
                </p>
              </div>

              {/* Compact Search Bar */}
              <form onSubmit={handleSearch} className="w-full sm:w-64 lg:w-80">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 text-slate-700 dark:text-white bg-white dark:bg-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-400"
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
                <p className="text-xs text-slate-500 dark:text-white mt-1 ml-1 hidden lg:block">
                  Search by name, ID, email, branch, course, or college
                </p>
              </form>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-white" />
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-white">
                  Total {activeTab === "students" ? "Students" : "Special Students"}: <span className={`font-semibold ${
                    activeTab === "students" ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                  }`}>{currentStudents.length}</span>
                </span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-white">
                    Showing: <span className="font-semibold text-slate-800 dark:text-white">{filteredStudents.length}</span> results
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
              <p className="text-slate-600 dark:text-white">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">No students found</h3>
              <p className="text-slate-500 dark:text-white text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No students have been registered yet"}
              </p>
            </div>
          ) : (
            // Students Table (no tabs, clear and scannable)
            <div>
              <div className="mb-3 px-2">
                <p className="text-sm text-slate-600 dark:text-white flex items-center gap-2">
                  <span className="font-medium text-sky-600 dark:text-sky-400">💡 Tip:</span>
                  Click on a student's name to view their detailed profile
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Student</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Email</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Branch</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Course</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Semester</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Group</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">College</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Coordinator Assigned</th>
                    {activeTab === "students" && (
                      <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Actions</th>
                    )}
                    {activeTab === "special" && (
                      <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600 dark:text-white">Special Events</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {paginatedStudents.map((s) => {
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
                                className="font-medium text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 truncate text-sm transition-colors text-left"
                              >
                                {s.name || "Unknown"}
                              </button>
                              <div className="text-xs text-slate-500 dark:text-white truncate">{s.studentId || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700 dark:text-white max-w-[260px] text-sm"><span className="truncate block">{s.email || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 dark:text-white text-sm">{s.branch || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-white text-sm">{s.course || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-white text-sm">{s.semester || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-white text-sm">{s.group || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-white text-sm max-w-[200px]"><span className="truncate block">{s.college || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 dark:text-white text-sm">{s.teacherId || "-"}</td>
                        {activeTab === "students" && (
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => handleEditStudent(s, e)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="Edit student"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteStudent(s, e)}
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Delete student"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                        {activeTab === "special" && (
                          <td className="px-4 py-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEventsStudent(s); }}
                              className="px-3 py-1.5 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                            >
                              See Events
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white">
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const page = i + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-sky-600 dark:bg-sky-500 text-white'
                                : 'border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-slate-500 dark:text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-white">{selectedStudent.name || "Unknown"}</h3>
                      <p className="text-sm text-slate-600 dark:text-white">{selectedStudent.studentId || "N/A"}</p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-white" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div>
                     
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Name</label>
                          <div className="mt-1 text-slate-800 dark:text-white font-medium">{selectedStudent.name || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Student ID</label>
                          <div className="mt-1 text-slate-800 dark:text-white font-medium">{selectedStudent.studentId || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Email</label>
                          <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.email || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Course</label>
                          <div className="mt-1 text-slate-800 dark:text-white font-medium">{selectedStudent.course || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Branch</label>
                          <div className="mt-1 text-slate-800 dark:text-white font-medium">{selectedStudent.branch || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Semester</label>
                          <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.semester || "-"}</div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Group</label>
                          <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.group || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* College Information */}
                    <div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">College</label>
                          <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.college || "-"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Information */}
                    <div>
             
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-slate-500 dark:text-white">Coordinator Assigned</label>
                          <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.teacherId || "Not Assigned"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info for Special Students */}
                  {activeTab === "special" && (
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-600">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-white mb-3 uppercase tracking-wide">Special Event Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudent.eventId && (
                          <div>
                            <label className="text-xs text-slate-500 dark:text-white">Event ID</label>
                            <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.eventId}</div>
                          </div>
                        )}
                        {selectedStudent.semester && (
                          <div>
                            <label className="text-xs text-slate-500 dark:text-white">Event Semester</label>
                            <div className="mt-1 text-slate-800 dark:text-white">{selectedStudent.semester}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contribution Calendar */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-600">
                    <div className="rounded-lg p-4 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-600">
                      {loadingActivity ? (
                        <div className="text-center py-8 text-slate-500 dark:text-white">Loading activity...</div>
                      ) : (
                        <ContributionCalendar 
                          activity={activity} 
                          stats={activityStats}
                          title="Student Activity"
                        />
                      )}
                    </div>
                  </div>

                  {/* Statistics Tabs */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-gray-600">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-white mb-4 uppercase tracking-wide">Statistics</h4>
                    
                    {loadingStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="animate-pulse">
                            <div className="h-20 bg-slate-200 dark:bg-gray-700 rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : studentStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Courses Enrolled */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800 dark:text-white">{studentStats.totalCoursesEnrolled || 0}</p>
                            <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">Courses Enrolled</p>
                          </div>
                        </div>

                        {/* Total Videos Watched */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-600 dark:bg-red-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800 dark:text-white">{studentStats.totalVideosWatched || 0}</p>
                            <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">Videos Watched</p>
                          </div>
                        </div>

                        {/* Problems Solved */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-600 dark:bg-green-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-800 dark:text-white">{studentStats.problemsSolved || 0}</p>
                            <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">Problems Solved</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-slate-500 dark:text-white py-6">No statistics available</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-slate-50 dark:bg-gray-700 border-t border-slate-200 dark:border-gray-600 px-6 py-4 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-slate-800 dark:bg-gray-600 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-gray-500 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelEdit}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-slate-800 dark:text-gray-100">Edit Student</h2>
                    <button
                      onClick={cancelEdit}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Student ID</label>
                      <input
                        type="text"
                        value={editForm.studentId}
                        onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Course</label>
                      <input
                        type="text"
                        value={editForm.course}
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Branch</label>
                      <input
                        type="text"
                        value={editForm.branch}
                        onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">College</label>
                      <input
                        type="text"
                        value={editForm.college}
                        onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Semester</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={editForm.semester}
                        onChange={(e) => setEditForm({ ...editForm, semester: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Group</label>
                      <input
                        type="text"
                        value={editForm.group}
                        onChange={(e) => setEditForm({ ...editForm, group: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Coordinator ID(s)</label>
                      <input
                        type="text"
                        value={editForm.teacherId}
                        onChange={(e) => setEditForm({ ...editForm, teacherId: e.target.value })}
                        placeholder="COO1 or COO1,COO2"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent"
                      />
                      <span className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Comma-separated for multiple coordinators</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStudent}
                      disabled={isSaving}
                      className="px-4 py-2 bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Special Student Events Modal - centered with blurred background */}
      {eventsStudent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* Light blurred backdrop */}
          <div
            className="absolute inset-0 bg-slate-200/60 dark:bg-black/40 backdrop-blur-sm"
            onClick={() => setEventsStudent(null)}
          />
          {/* Modal card */}
          <div className="relative z-50 w-full max-w-2xl mx-4 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Special Events for {eventsStudent.name || 'Student'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-300">
                  Showing all special events this student has been invited to.
                </p>
              </div>
              <button
                onClick={() => setEventsStudent(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 max-h-80 overflow-y-auto">
              {Array.isArray(eventsStudent.specialEvents) && eventsStudent.specialEvents.length > 0 ? (
                <table className="min-w-full text-xs divide-y divide-slate-200 dark:divide-gray-700">
                  <thead className="bg-slate-50 dark:bg-gray-700/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-gray-200">Event Name</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-gray-200">Created On</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600 dark:text-gray-200">Created By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {eventsStudent.specialEvents.map((ev) => {
                      if (!ev) return null;
                      const createdAt = ev.createdAt ? new Date(ev.createdAt) : null;
                      const createdOnLabel = createdAt ? createdAt.toLocaleDateString() : '-';
                      const createdByLabel = ev.createdBy || (ev.coordinatorId ? 'Coordinator' : 'Admin');
                      return (
                        <tr key={ev._id || `${ev.name}-${createdOnLabel}`}>
                          <td className="px-3 py-2 text-slate-800 dark:text-gray-100 whitespace-nowrap">{ev.name || '-'}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-gray-200 whitespace-nowrap">{createdOnLabel}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-gray-200 whitespace-nowrap">{createdByLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 dark:text-gray-300">
                  This student has not been added to any special events yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
