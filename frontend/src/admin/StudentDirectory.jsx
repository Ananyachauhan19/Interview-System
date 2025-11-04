/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Mail, IdCard, BookOpen, GraduationCap, Building2, Calendar, Loader2, X } from "lucide-react";

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    // Client-side filtering for instant feedback
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = students.filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.email?.toLowerCase().includes(query) ||
          s.studentId?.toLowerCase().includes(query) ||
          s.branch?.toLowerCase().includes(query) ||
          s.course?.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const loadStudents = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.listAllStudents();
      setStudents(data.students || []);
      setFilteredStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const data = await api.listAllStudents(searchQuery);
      setStudents(data.students || []);
      setFilteredStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Failed to search students");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    loadStudents();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full max-w-7xl mx-auto px-4 py-6"
      >
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {/* Header Section */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Users className="text-emerald-600 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Student Directory</h2>
              <p className="text-slate-600 text-sm">View and search all registered students</p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or student ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Stats */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  Total Students: <span className="text-emerald-600 font-semibold">{students.length}</span>
                </span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Showing: <span className="font-semibold text-slate-800">{filteredStudents.length}</span> results
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
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
              <p className="text-slate-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No students found</h3>
              <p className="text-slate-500 text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "No students have been registered yet"}
              </p>
            </div>
          ) : (
            /* Students Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredStudents.map((student, idx) => (
                  <motion.div
                    key={student._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-lg hover:border-emerald-300 transition-all duration-200"
                  >
                    {/* Student Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {student.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {student.name || "Unknown"}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded mt-1">
                            <IdCard className="w-3 h-3" />
                            {student.studentId || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Student Details */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{student.email || "No email"}</span>
                      </div>

                      {student.branch && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <GraduationCap className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>{student.branch}</span>
                        </div>
                      )}

                      {student.course && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span>{student.course}</span>
                        </div>
                      )}

                      {student.college && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{student.college}</span>
                        </div>
                      )}

                      {student.createdAt && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Registered: {new Date(student.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
