/* eslint-disable no-unused-vars */
import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { motion } from "framer-motion";
import { Search, Users, Loader2, X } from "lucide-react";
import Fuse from "fuse.js";

export default function CoordinatorDirectory() {
  const [coordinators, setCoordinators] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fuse = useMemo(() => {
    return new Fuse(coordinators, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'coordinatorId', weight: 2 },
        { name: 'email', weight: 1.5 },
      ],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      getFn: (obj, path) => {
        const value = Fuse.config.getFn(obj, path);
        if (typeof value === 'string') {
          return value.toLowerCase().replace(/[.\s-]/g, '');
        }
        return value;
      }
    });
  }, [coordinators]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFiltered(coordinators);
    } else {
      const normalizedQuery = searchQuery.toLowerCase().replace(/[.\s-]/g, '');
      const results = fuse.search(normalizedQuery);
      setFiltered(results.map(r => r.item));
    }
  }, [searchQuery, coordinators, fuse]);

  const loadData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.listAllCoordinators();
      const list = data.coordinators || [];
      setCoordinators(list);
      setFiltered(list);
    } catch (err) {
      setError(err.message || "Failed to load coordinators");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setFiltered(coordinators);
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
          {/* Header Section with Search */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">Coordinator Database</h2>
                <p className="text-slate-600 text-sm">View and search all coordinators</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="w-80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search coordinators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-700"
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
              <p className="text-xs text-slate-500 mt-1 ml-1">Search by name, coordinator ID, or email</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">
                  Total Coordinators: <span className="font-semibold text-indigo-600">{coordinators.length}</span>
                </span>
              </div>
              {searchQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Showing: <span className="font-semibold text-slate-800">{filtered.length}</span> results
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Loading / Empty / Table */}
          {isLoading && coordinators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-slate-600">Loading coordinators...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No coordinators found</h3>
              <p className="text-slate-500 text-sm">{searchQuery ? "Try adjusting your search query" : "No coordinators have been added yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Coordinator</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Coordinator ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Students Assigned</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-slate-600">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((c) => {
                    const initial = c.name?.charAt(0)?.toUpperCase() || "?";
                    const registered = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-";
                    return (
                      <tr key={c._id || c.email} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3 min-w-[220px]">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
                              {initial}
                            </div>
                            <div className="max-w-[280px]">
                              <div className="font-medium text-slate-900 truncate text-sm">{c.name || "Unknown"}</div>
                              <div className="text-xs text-slate-500 truncate">{c.coordinatorId || "N/A"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-700 max-w-[260px] text-sm">
                          <span className="truncate block">{c.email || "-"}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-700 text-sm">{c.coordinatorId || "-"}</td>
                        <td className="px-4 py-2 text-slate-700 text-sm">{c.studentsAssigned ?? 0}</td>
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
