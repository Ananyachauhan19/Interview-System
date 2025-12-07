import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mail, User, BookOpen, School, Building, X, CheckCircle, AlertCircle } from "lucide-react";

export default function CoordinatorStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.listAllStudents();
      setStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Failed to load students");
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.branch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StudentDetailModal = ({ student, onClose }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
      >
        <div className="bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{student.name}</h3>
              <p className="text-sky-100 text-sm">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Student ID</p>
                <p className="text-sm font-semibold text-slate-800">{student.studentId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Course</p>
                <p className="text-sm font-semibold text-slate-800">{student.course || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Semester</p>
                <p className="text-sm font-semibold text-slate-800">{student.semester || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <School className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Branch</p>
                <p className="text-sm font-semibold text-slate-800">{student.branch || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Building className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">College</p>
                <p className="text-sm font-semibold text-slate-800">{student.college || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
            <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-cyan-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium">Email Address</p>
              <p className="text-sm font-semibold text-slate-800 break-all">{student.email}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">My Students</h1>
          <p className="text-slate-600">View and manage students assigned to you</p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, student ID, or branch..."
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-12 text-center"
          >
            <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Students Found</h3>
            <p className="text-slate-500">
              {searchTerm ? "Try adjusting your search terms" : "No students have been assigned to you yet"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Branch
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Semester
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      College
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student._id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                            <span className="text-sky-600 font-semibold text-sm">
                              {student.name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.name}</p>
                            <p className="text-sm text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-slate-700">{student.studentId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{student.branch || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{student.semester || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{student.college || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold">{filteredStudents.length}</span> of{" "}
                <span className="font-semibold">{students.length}</span> students
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
