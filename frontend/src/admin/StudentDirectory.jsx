/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { motion } from "framer-motion";
import { Search, Users, Loader2, X } from "lucide-react";
import Fuse from "fuse.js";

export default function StudentDirectory() {
  const [students, setStudents] = useState([]);
  const [specialStudents, setSpecialStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("students"); // "students" or "special"

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 w-full max-w-7xl mx-auto px-4 py-6"
      >
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "students"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab("special")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "special"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-800"
              }`}
            >
              Special Students
            </button>
          </div>
          
          {/* Header Section with Search */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                activeTab === "students" ? "bg-emerald-100" : "bg-indigo-100"
              }`}>
                <Users className={`w-6 h-6 ${
                  activeTab === "students" ? "text-emerald-600" : "text-indigo-600"
                }`} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">
                  {activeTab === "students" ? "Student Database" : "Special Event Students"}
                </h2>
                <p className="text-slate-600 text-sm">
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
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-700"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-500" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 ml-1">
                Search by name, ID, email, branch, course, or college
              </p>
            </form>
          </div>

          {/* Stats */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  Total {activeTab === "students" ? "Students" : "Special Students"}: <span className={`font-semibold ${
                    activeTab === "students" ? "text-emerald-600" : "text-indigo-600"
                  }`}>{currentStudents.length}</span>
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
            // Students Table (no tabs, clear and scannable)
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Student</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Email</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Branch</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Course</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">College</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Coordinator Assigned</th>
                    {activeTab === "special" && (
                      <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Events</th>
                    )}
                    <th scope="col" className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map((s) => {
                    const initial = s.name?.charAt(0)?.toUpperCase() || "?";
                    const registered = s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "-";
                    return (
                      <tr key={s._id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                              activeTab === "students" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"
                            }`}>
                              {initial}
                            </div>
                            <div className="max-w-[280px]">
                              <div className="font-medium text-slate-900 truncate text-sm">{s.name || "Unknown"}</div>
                              <div className="text-xs text-slate-500 truncate">{s.studentId || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700 max-w-[260px] text-sm"><span className="truncate block">{s.email || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 text-sm">{s.branch || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 text-sm">{s.course || "-"}</td>
                        <td className="px-4 py-2 text-slate-600 text-sm max-w-[200px]"><span className="truncate block">{s.college || "-"}</span></td>
                        <td className="px-4 py-2 text-slate-700 text-sm">{s.teacherId || "-"}</td>
                        {activeTab === "special" && (
                          <td className="px-4 py-2 text-slate-700 text-sm">
                            <div className="flex flex-wrap gap-1">
                              {s.events && s.events.length > 0 ? (
                                s.events.map((evt, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                    {evt?.name || "Unknown Event"}
                                  </span>
                                ))
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  No Events
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-2 text-slate-600 text-sm">{registered}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
