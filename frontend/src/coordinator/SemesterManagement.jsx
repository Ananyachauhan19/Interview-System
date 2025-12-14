import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { api } from '../utils/api';
import socketService from '../utils/socket';
import {
  BookOpen, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Save, X,
  Star, Upload, Link as LinkIcon, FileText, GripVertical, Video, File, Calendar, Menu, ArrowLeft
} from 'lucide-react';
import { useToast } from '../components/CustomToast';

const difficultyColors = {
  'easy': 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  'easy-medium': 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300',
  'medium': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  'medium-hard': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  'hard': 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
};

export default function SemesterManagement() {
  const navigate = useNavigate();
  const toast = useToast();
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [editingSemester, setEditingSemester] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState('wide'); // 'narrow', 'wide', 'extra-wide'
  const [defaultSemestersCreated, setDefaultSemestersCreated] = useState(false);

  useEffect(() => {
    loadSemesters(true); // Initial load with default semester creation
  }, []);

  // Auto-create default semesters (1-12) if they don't exist
  const ensureDefaultSemesters = async (existingSemesters) => {
    // Prevent concurrent execution
    if (defaultSemestersCreated) {
      console.log('Semesters already created, skipping...');
      return false;
    }

    // Extract existing semester numbers (case-insensitive)
    const existingSemesterMap = new Map();
    existingSemesters.forEach(sem => {
      const match = sem.semesterName.match(/Semester\s+(\d+)/i);
      if (match) {
        const num = parseInt(match[1]);
        // Keep track of all semesters with this number
        if (!existingSemesterMap.has(num)) {
          existingSemesterMap.set(num, []);
        }
        existingSemesterMap.get(num).push(sem);
      }
    });

    const semestersToCreate = [];
    for (let i = 1; i <= 12; i++) {
      if (!existingSemesterMap.has(i)) {
        semestersToCreate.push(i);
      }
    }

    console.log('Existing semesters:', Array.from(existingSemesterMap.keys()).sort((a, b) => a - b));
    console.log('Semesters to create:', semestersToCreate);

    if (semestersToCreate.length > 0) {
      try {
        setDefaultSemestersCreated(true); // Set flag before creating
        console.log(`Creating ${semestersToCreate.length} missing semesters...`);
        
        // Create all semesters in parallel (backend will handle duplicates)
        const createPromises = semestersToCreate.map(async (num) => {
          const semesterName = `Semester ${num}`;
          try {
            const result = await api.createSemester(semesterName, `Default semester ${num}`);
            console.log(`✓ ${semesterName}`);
            return result;
          } catch (err) {
            console.error(`✗ Failed to create ${semesterName}:`, err.message);
            return null;
          }
        });
        
        await Promise.all(createPromises);
        console.log('✓ Semester creation complete');
        
        // Reload to get the newly created semesters
        return true;
      } catch (err) {
        console.error('Failed to create default semesters:', err);
        setDefaultSemestersCreated(false); // Reset on error
        return false;
      }
    } else {
      console.log('All 12 semesters already exist');
      setDefaultSemestersCreated(true); // All semesters exist
    }
    return false;
  };

  // Socket.IO real-time synchronization
  useEffect(() => {
    // Connect to socket
    socketService.connect();

    // Listen for learning module updates
    const handleLearningUpdate = (data) => {
      console.log('[Socket] Learning updated:', data);
      // Reload semesters to get latest data
      loadSemesters();
    };

    socketService.on('learning-updated', handleLearningUpdate);

    // Cleanup on unmount
    return () => {
      socketService.off('learning-updated', handleLearningUpdate);
    };
  }, []);

  const loadSemesters = async (isInitialLoad = false) => {
    try {
      setLoading(true);
      let finalData;
      
      // Only on initial load: cleanup duplicates first, then create missing semesters
      if (isInitialLoad && !defaultSemestersCreated) {
        console.log('Running initial setup: cleanup duplicates + create missing semesters');
        
        // Step 1: Cleanup any existing duplicates
        try {
          const cleanupResult = await api.cleanupDuplicateSemesters();
          console.log('Cleanup result:', cleanupResult);
        } catch (err) {
          console.error('Cleanup failed (continuing anyway):', err);
        }
        
        // Step 2: Get fresh list after cleanup
        const cleanData = await api.listSemesters();
        
        // Step 3: Create missing semesters
        const needsReload = await ensureDefaultSemesters(cleanData.semesters || []);
        
        // Step 4: Final reload
        finalData = needsReload ? await api.listSemesters() : cleanData;
      } else {
        // Normal load without cleanup
        finalData = await api.listSemesters();
      }
      
      setSemesters(finalData.semesters || []);
      
      // If a semester was already selected, maintain selection after reload
      if (selectedSemester && finalData.semesters && finalData.semesters.length > 0) {
        const updatedSelectedSemester = finalData.semesters.find(s => s._id === selectedSemester._id);
        if (updatedSelectedSemester) {
          setSelectedSemester(updatedSelectedSemester);
        } else {
          // If previously selected semester no longer exists, select first
          setSelectedSemester(finalData.semesters[0]);
        }
      } else if (!selectedSemester && finalData.semesters && finalData.semesters.length > 0) {
        // Only auto-select first semester if none was selected
        setSelectedSemester(finalData.semesters[0]);
      }
    } catch (err) {
      console.error('Failed to load learning modules:', err);
      toast.error('Failed to load learning modules');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSemester = (semester) => {
    setSelectedSemester(semester);
    setExpandedSubjects(new Set()); // Reset expanded subjects when changing module
    setExpandedChapters(new Set()); // Reset expanded chapters when changing module
  };

  const toggleSubject = (subjectId) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(subjectId)) newSet.delete(subjectId);
    else newSet.add(subjectId);
    setExpandedSubjects(newSet);
  };

  const toggleChapter = (chapterId) => {
    const newSet = new Set(expandedChapters);
    if (newSet.has(chapterId)) newSet.delete(chapterId);
    else newSet.add(chapterId);
    setExpandedChapters(newSet);
  };

  const handleAddSemester = async () => {
    if (!newSemester.semesterName.trim()) {
      toast.error('Module name is required');
      return;
    }
    
    // Validate semester format: must contain "Semester" followed by a whole number
    const semesterPattern = /^Semester\s+(\d+)$/i;
    const match = newSemester.semesterName.trim().match(semesterPattern);
    
    if (!match) {
      toast.error('Invalid format! Use: "Semester 1", "Semester 2", etc.');
      return;
    }
    
    const semesterNumber = parseInt(match[1]);
    if (!Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 12) {
      toast.error('Semester number must be a whole number between 1 and 12');
      return;
    }
    
    // Check for duplicate semester
    const duplicate = semesters.find(
      sem => sem.semesterName.toLowerCase() === newSemester.semesterName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error('This learning module already exists');
      return;
    }
    
    try {
      await api.createSemester(newSemester.semesterName, newSemester.semesterDescription);
      toast.success('Learning module added successfully');
      setNewSemester({ semesterName: '', semesterDescription: '' });
      setShowAddSemester(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to add learning module:', err);
      toast.error(err.message || 'Failed to add learning module');
    }
  };

  const handleDeleteSemester = async (semesterId) => {
    if (!confirm('Delete this learning module and all its subjects/chapters/topics?')) return;
    try {
      await api.deleteSemester(semesterId);
      toast.success('Learning module deleted');
      if (selectedSemester?._id === semesterId) {
        setSelectedSemester(null);
      }
      loadSemesters();
    } catch (err) {
      console.error('Failed to delete learning module:', err);
      toast.error('Failed to delete learning module');
    }
  };

  const handleUpdateSemester = async (semesterId) => {
    if (!editingSemester.semesterName.trim()) {
      toast.error('Module name is required');
      return;
    }
    try {
      await api.updateSemester(semesterId, {
        semesterName: editingSemester.semesterName,
        semesterDescription: editingSemester.semesterDescription
      });
      toast.success('Learning module updated');
      setEditingSemester(null);
      loadSemesters();
    } catch (err) {
      console.error('Failed to update learning module:', err);
      toast.error('Failed to update learning module');
    }
  };

  const handleReorderSemesters = async (newOrder) => {
    setSemesters(newOrder);
    try {
      const semesterIds = newOrder.map(s => s._id);
      await api.reorderSemesters(semesterIds);
    } catch (err) {
      console.error('Failed to reorder learning modules:', err);
      toast.error('Failed to save order');
      loadSemesters();
    }
  };

  const getSidebarWidthClass = () => {
    if (!isSidebarOpen) return 'w-0';
    switch (sidebarWidth) {
      case 'narrow': return 'w-64';
      case 'wide': return 'w-80';
      case 'extra-wide': return 'w-96';
      default: return 'w-80';
    }
  };

  const cycleSidebarWidth = () => {
    if (sidebarWidth === 'narrow') setSidebarWidth('wide');
    else if (sidebarWidth === 'wide') setSidebarWidth('extra-wide');
    else setSidebarWidth('narrow');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-lg text-slate-800 dark:text-gray-100">Loading learning modules...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 pt-16">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* LEFT SIDEBAR - Learning Modules */}
        <div className={`${getSidebarWidthClass()} transition-all duration-300 overflow-hidden border-r border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm`}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-gray-100">Learning Modules</h2>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={cycleSidebarWidth}
                    className="p-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Adjust Width"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{semesters.length} learning module{semesters.length !== 1 ? 's' : ''} total</p>
            </div>

            {/* Learning Modules List */}
            <div className="flex-1 overflow-y-auto p-3">
              {semesters.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-gray-400">
                  <Calendar className="w-14 h-14 mx-auto mb-3 text-slate-300 dark:text-gray-600" />
                  <p className="text-sm font-medium">Loading semesters...</p>
                </div>
              ) : (
                <Reorder.Group axis="y" values={semesters} onReorder={handleReorderSemesters} className="space-y-2">
                  {semesters.map((semester) => (
                    <Reorder.Item key={semester._id} value={semester}>
                      <div
                        className={`p-3 rounded-lg cursor-pointer transition-all border ${
                          selectedSemester?._id === semester._id
                            ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-600 shadow-sm ring-1 ring-sky-200 dark:ring-sky-700'
                            : 'bg-white dark:bg-gray-700 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600 hover:border-slate-300 dark:hover:border-gray-500 hover:shadow-sm'
                        }`}
                        onClick={() => handleSelectSemester(semester)}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical
                            className="w-4 h-4 text-slate-400 dark:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1 hover:text-slate-600 dark:hover:text-gray-400"
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            {editingSemester?._id === semester._id ? (
                              <div onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingSemester.semesterName}
                                  onChange={(e) => setEditingSemester({ ...editingSemester, semesterName: e.target.value })}
                                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg mb-2 text-sm text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                />
                                <textarea
                                  value={editingSemester.semesterDescription || ''}
                                  onChange={(e) => setEditingSemester({ ...editingSemester, semesterDescription: e.target.value })}
                                  className="w-full px-2 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg mb-2 text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                                  rows="2"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleUpdateSemester(semester._id)}
                                    className="flex-1 flex items-center justify-center gap-1 bg-sky-500 text-white px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors shadow-sm"
                                  >
                                    <Save className="w-3 h-3" />
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingSemester(null)}
                                    className="flex-1 flex items-center justify-center gap-1 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-300 dark:hover:bg-gray-500 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-semibold text-sm text-slate-800 dark:text-gray-100 truncate">{semester.semesterName}</h3>
                                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 font-medium">
                                  {semester.subjects?.length || 0} subject{semester.subjects?.length !== 1 ? 's' : ''}
                                </p>
                              </>
                            )}
                          </div>
                          {editingSemester?._id !== semester._id && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setEditingSemester(semester)}
                                className="p-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/40 rounded-lg transition-colors"
                                title="Edit Description"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT - Subjects/Chapters/Topics */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors border border-slate-200 dark:border-gray-700"
                  title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                >
                  {isSidebarOpen ? <ChevronRight className="w-5 h-5 text-slate-600 dark:text-gray-400" /> : <Menu className="w-5 h-5 text-slate-600 dark:text-gray-400" />}
                </button>
                <div className="w-12 h-12 rounded-lg bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                    {selectedSemester ? selectedSemester.semesterName : 'Select a Learning Module'}
                  </h1>
                  {selectedSemester?.semesterDescription && (
                    <p className="text-sm text-slate-600 dark:text-gray-400 font-medium mt-0.5">{selectedSemester.semesterDescription}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            {!selectedSemester ? (
              <div className="text-center py-20 text-slate-500 dark:text-gray-400">
                <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-slate-400 dark:text-gray-500" />
                </div>
                <p className="text-lg font-semibold text-slate-700 dark:text-gray-300 mb-1">No Learning Module Selected</p>
                <p className="text-sm text-slate-500 dark:text-gray-400">Choose a learning module from the sidebar to view and manage subjects</p>
              </div>
            ) : (
              <SubjectList
                semester={selectedSemester}
                loadSemesters={loadSemesters}
                expandedSubjects={expandedSubjects}
                toggleSubject={toggleSubject}
                expandedChapters={expandedChapters}
                toggleChapter={toggleChapter}
                semesters={semesters}
                setSemesters={setSemesters}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// New SubjectList component for the main content area
function SubjectList({
  semester, loadSemesters, expandedSubjects, toggleSubject,
  expandedChapters, toggleChapter, semesters, setSemesters
}) {
  const toast = useToast();
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ subjectName: '', subjectDescription: '' });

  const handleAddSubject = async () => {
    if (!newSubject.subjectName.trim()) {
      toast.error('Subject name is required');
      return;
    }
    
    // Check for duplicate subject
    const duplicate = semester.subjects?.find(
      sub => sub.subjectName.toLowerCase() === newSubject.subjectName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error('A subject with this name already exists in this semester');
      return;
    }
    
    try {
      await api.addSubject(semester._id, newSubject.subjectName, newSubject.subjectDescription);
      toast.success('Subject added successfully');
      setNewSubject({ subjectName: '', subjectDescription: '' });
      setShowAddSubject(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to add subject:', err);
      toast.error('Failed to add subject');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Delete this subject and all its chapters/topics?')) return;
    try {
      await api.deleteSubject(semester._id, subjectId);
      toast.success('Subject deleted');
      loadSemesters();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      toast.error('Failed to delete subject');
    }
  };

  const handleReorderSubjects = async (newOrder) => {
    const updatedSemesters = semesters.map(s =>
      s._id === semester._id ? { ...s, subjects: newOrder } : s
    );
    setSemesters(updatedSemesters);
    try {
      const subjectIds = newOrder.map(sub => sub._id);
      await api.reorderSubjects(semester._id, subjectIds);
    } catch (err) {
      console.error('Failed to reorder subjects:', err);
      toast.error('Failed to save order');
      loadSemesters();
    }
  };

  return (
    <div>
      {/* Add Subject Button */}
      <button
        onClick={() => setShowAddSubject(true)}
        className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2.5 rounded-lg hover:bg-sky-600 mb-6 font-medium shadow-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Subject
      </button>

      {/* Add Subject Modal */}
      {showAddSubject && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm mb-6 border border-slate-200 dark:border-gray-700"
          >
            <h4 className="text-base font-semibold mb-4 text-slate-800 dark:text-gray-100">New Subject</h4>
            <input
              type="text"
              placeholder="Subject name (e.g., Data Structures)"
              value={newSubject.subjectName}
              onChange={(e) => setNewSubject({ ...newSubject, subjectName: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg mb-3 text-sm text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
            />
            <textarea
              placeholder="Description (optional)"
              value={newSubject.subjectDescription}
              onChange={(e) => setNewSubject({ ...newSubject, subjectDescription: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg mb-4 text-sm text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all resize-none"
              rows="2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSubject}
                className="flex items-center gap-1.5 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 font-medium shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddSubject(false);
                  setNewSubject({ subjectName: '', subjectDescription: '' });
                }}
                className="flex items-center gap-1.5 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-gray-500 font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {semester.subjects && semester.subjects.length > 0 ? (
        <Reorder.Group
          axis="y"
          values={semester.subjects}
          onReorder={handleReorderSubjects}
          className="space-y-4"
        >
          {semester.subjects.map((subject) => (
            <SubjectCard
              key={subject._id}
              subject={subject}
              semesterId={semester._id}
              isExpanded={expandedSubjects.has(subject._id)}
              onToggle={() => toggleSubject(subject._id)}
              onDelete={() => handleDeleteSubject(subject._id)}
              loadSemesters={loadSemesters}
              expandedChapters={expandedChapters}
              toggleChapter={toggleChapter}
              semesters={semesters}
              setSemesters={setSemesters}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700">
          <BookOpen className="w-14 h-14 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-gray-400 font-medium">No subjects yet</p>
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Click "Add Subject" to create one</p>
        </div>
      )}
    </div>
  );
}
function SubjectCard({ subject, semesterId, isExpanded, onToggle, onDelete, loadSemesters, expandedChapters, toggleChapter, semesters, setSemesters }) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...subject });
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapter, setNewChapter] = useState({ chapterName: '', importanceLevel: 3 });

  const handleUpdate = async () => {
    if (!editData.subjectName.trim()) {
      toast.error('Subject name is required');
      return;
    }
    try {
      await api.updateSubject(semesterId, subject._id, {
        subjectName: editData.subjectName,
        subjectDescription: editData.subjectDescription
      });
      toast.success('Subject updated');
      setIsEditing(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to update subject:', err);
      toast.error('Failed to update subject');
    }
  };

  const handleAddChapter = async () => {
    if (!newChapter.chapterName.trim()) {
      toast.error('Chapter name is required');
      return;
    }
    
    // Check for duplicate chapter
    const duplicate = subject.chapters?.find(
      ch => ch.chapterName.toLowerCase() === newChapter.chapterName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error('A chapter with this name already exists in this subject');
      return;
    }
    
    try {
      await api.addChapter(semesterId, subject._id, newChapter.chapterName, newChapter.importanceLevel);
      toast.success('Chapter added');
      setNewChapter({ chapterName: '', importanceLevel: 3 });
      setShowAddChapter(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to add chapter:', err);
      toast.error('Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapterId) => {
    if (!confirm('Delete this chapter and all its topics?')) return;
    try {
      await api.deleteChapter(semesterId, subject._id, chapterId);
      toast.success('Chapter deleted');
      loadSemesters();
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      toast.error('Failed to delete chapter');
    }
  };

  const handleReorderChapters = async (newOrder) => {
    // Update local state immediately for smooth UI
    const updatedSemesters = semesters.map(sem => {
      if (sem._id === semesterId) {
        return {
          ...sem,
          subjects: sem.subjects.map(subj => 
            subj._id === subject._id ? { ...subj, chapters: newOrder } : subj
          )
        };
      }
      return sem;
    });
    setSemesters(updatedSemesters);
    
    try {
      const chapterIds = newOrder.map(c => c._id);
      await api.reorderChapters(semesterId, subject._id, chapterIds);
    } catch (err) {
      console.error('Failed to reorder chapters:', err);
      toast.error('Failed to save order');
      loadSemesters();
    }
  };

  return (
    <Reorder.Item value={subject} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 transition-all">
      <div className="p-3 bg-white dark:bg-gray-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <GripVertical 
              className="w-4 h-4 text-slate-400 dark:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 hover:text-slate-600 dark:hover:text-gray-400" 
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editData.subjectName}
                    onChange={(e) => setEditData({ ...editData, subjectName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-sm font-medium text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <textarea
                    value={editData.subjectDescription || ''}
                    onChange={(e) => setEditData({ ...editData, subjectDescription: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                    rows="2"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={handleUpdate} className="flex items-center gap-1 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 text-xs font-medium shadow-sm transition-colors">
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-slate-300 dark:hover:bg-gray-500 transition-colors">
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
                      <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{subject.subjectName}</h3>
                  </div>
                  {subject.subjectDescription && <p className="text-slate-600 dark:text-gray-400 mt-1.5 text-xs leading-relaxed">{subject.subjectDescription}</p>}
                  <p className="text-slate-500 dark:text-gray-500 text-xs mt-1.5 font-medium">{subject.chapters?.length || 0} chapter{subject.chapters?.length !== 1 ? 's' : ''}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-1.5 bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={onDelete} className="p-1.5 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <div className="p-1.5 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-gray-400 rounded border border-slate-200 dark:border-gray-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 dark:border-gray-700">
            <div className="p-3 bg-slate-50 dark:bg-gray-900">
              <button
                onClick={() => setShowAddChapter(true)}
                className="flex items-center gap-1.5 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 mb-2 text-xs font-medium shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Chapter
              </button>

              {showAddChapter && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-gray-800 p-3 rounded mb-3 border border-slate-200 dark:border-gray-700 shadow-sm">
                  <h4 className="text-xs font-semibold mb-2 text-slate-800 dark:text-gray-100">New Chapter</h4>
                  <input
                    type="text"
                    placeholder="Chapter name"
                    value={newChapter.chapterName}
                    onChange={(e) => setNewChapter({ ...newChapter, chapterName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded mb-2 text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <div className="mb-2">
                    <label className="block text-xs font-medium mb-1.5 text-slate-700 dark:text-gray-300">Importance Level</label>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          onClick={() => setNewChapter({ ...newChapter, importanceLevel: level })}
                          className={`p-0.5 transition-colors ${level <= newChapter.importanceLevel ? 'text-amber-500' : 'text-slate-300 dark:text-gray-600 hover:text-slate-400 dark:hover:text-gray-500'}`}
                        >
                          <Star className="w-4 h-4" fill={level <= newChapter.importanceLevel ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleAddChapter} className="flex items-center gap-1 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 text-xs font-medium shadow-sm transition-colors">
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowAddChapter(false);
                        setNewChapter({ chapterName: '', importanceLevel: 3 });
                      }}
                      className="flex items-center gap-1 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2.5 py-1.5 rounded hover:bg-slate-300 dark:hover:bg-gray-500 text-xs font-medium transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {subject.chapters && subject.chapters.length > 0 ? (
                <Reorder.Group axis="y" values={subject.chapters} onReorder={handleReorderChapters} className="space-y-1.5">
                  {subject.chapters.map((chapter) => (
                    <ChapterCard
                      key={chapter._id}
                      chapter={chapter}
                      semesterId={semesterId}
                      subjectId={subject._id}
                      isExpanded={expandedChapters.has(chapter._id)}
                      onToggle={() => toggleChapter(chapter._id)}
                      onDelete={() => handleDeleteChapter(chapter._id)}
                      loadSemesters={loadSemesters}
                      semesters={semesters}
                      setSemesters={setSemesters}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-gray-700 mb-2">
                    <BookOpen className="w-5 h-5 text-slate-400 dark:text-gray-500" />
                  </div>
                  <p className="text-slate-500 dark:text-gray-400 text-xs">No chapters added yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function ChapterCard({ chapter, semesterId, subjectId, isExpanded, onToggle, onDelete, loadSemesters, semesters, setSemesters }) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...chapter });
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ topicName: '', difficulty: 'medium', videoLink: '', notesPDF: null, questionPDF: null });

  const handleUpdate = async () => {
    if (!editData.chapterName.trim()) {
      toast.error('Chapter name is required');
      return;
    }
    try {
      await api.updateChapter(semesterId, subjectId, chapter._id, {
        chapterName: editData.chapterName,
        importanceLevel: editData.importanceLevel
      });
      toast.success('Chapter updated');
      setIsEditing(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to update chapter:', err);
      toast.error('Failed to update chapter');
    }
  };

  const handleAddTopic = async () => {
    if (!newTopic.topicName.trim()) {
      toast.error('Topic name is required');
      return;
    }
    
    // Check for duplicate topic
    const duplicate = chapter.topics?.find(
      tp => tp.topicName.toLowerCase() === newTopic.topicName.trim().toLowerCase()
    );
    if (duplicate) {
      toast.error('A topic with this name already exists in this chapter');
      return;
    }
    
    try {
      console.log('[handleAddTopic] Creating FormData...');
      const formData = new FormData();
      formData.append('topicName', newTopic.topicName);
      formData.append('difficulty', newTopic.difficulty);
      if (newTopic.videoLink) formData.append('topicVideoLink', newTopic.videoLink);
      if (newTopic.notesPDF) {
        console.log('[handleAddTopic] Adding notes PDF file:', newTopic.notesPDF.name);
        formData.append('notesPDF', newTopic.notesPDF);
      }
      if (newTopic.questionPDF) {
        console.log('[handleAddTopic] Adding PDF file:', newTopic.questionPDF.name);
        formData.append('questionPDF', newTopic.questionPDF);
      }
      
      console.log('[handleAddTopic] Calling API...');
      await api.addTopic(semesterId, subjectId, chapter._id, formData);
      console.log('[handleAddTopic] Topic added successfully');
      toast.success('Topic added');
      setNewTopic({ topicName: '', difficulty: 'medium', videoLink: '', notesPDF: null, questionPDF: null });
      setShowAddTopic(false);
      loadSemesters();
    } catch (err) {
      console.error('[handleAddTopic] Failed to add topic:', err);
      toast.error(`Failed to add topic: ${err.message}`);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm('Delete this topic?')) return;
    try {
      await api.deleteTopic(semesterId, subjectId, chapter._id, topicId);
      toast.success('Topic deleted');
      loadSemesters();
    } catch (err) {
      console.error('Failed to delete topic:', err);
      toast.error('Failed to delete topic');
    }
  };

  const handleReorderTopics = async (newOrder) => {
    // Update local state immediately for smooth UI
    const updatedSemesters = semesters.map(sem => {
      if (sem._id === semesterId) {
        return {
          ...sem,
          subjects: sem.subjects.map(subj => {
            if (subj._id === subjectId) {
              return {
                ...subj,
                chapters: subj.chapters.map(chap => 
                  chap._id === chapter._id ? { ...chap, topics: newOrder } : chap
                )
              };
            }
            return subj;
          })
        };
      }
      return sem;
    });
    setSemesters(updatedSemesters);
    
    try {
      const topicIds = newOrder.map(t => t._id);
      await api.reorderTopics(semesterId, subjectId, chapter._id, topicIds);
    } catch (err) {
      console.error('Failed to reorder topics:', err);
      toast.error('Failed to save order');
      loadSemesters();
    }
  };

  return (
    <Reorder.Item value={chapter} className="bg-white dark:bg-gray-800 rounded border border-slate-200 dark:border-gray-700 shadow-sm hover:border-slate-300 dark:hover:border-gray-600 transition-all">
      <div className="p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-1.5 flex-1">
            <GripVertical 
              className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 hover:text-slate-600 dark:hover:text-gray-400" 
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editData.chapterName}
                    onChange={(e) => setEditData({ ...editData, chapterName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded font-medium text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-700 dark:text-gray-300">Importance Level</label>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          onClick={() => setEditData({ ...editData, importanceLevel: level })}
                          className={`p-0.5 transition-colors ${level <= editData.importanceLevel ? 'text-amber-500' : 'text-slate-300 dark:text-gray-600 hover:text-slate-400 dark:hover:text-gray-500'}`}
                        >
                          <Star className="w-3.5 h-3.5" fill={level <= editData.importanceLevel ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={handleUpdate} className="flex items-center gap-1 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 text-xs font-medium shadow-sm transition-colors">
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2.5 py-1.5 rounded hover:bg-slate-300 dark:hover:bg-gray-500 text-xs font-medium transition-colors">
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{chapter.chapterName}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-2.5 h-2.5 ${i < chapter.importanceLevel ? 'text-amber-500' : 'text-slate-300 dark:text-gray-600'}`}
                        fill={i < chapter.importanceLevel ? 'currentColor' : 'none'}
                      />
                    ))}
                    <span className="text-xs text-slate-500 dark:text-gray-400 font-medium ml-1">({chapter.topics?.length || 0} topics)</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {!isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-1 bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={onDelete} className="p-1 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
            <div className="p-1 bg-slate-50 dark:bg-gray-700 text-slate-600 dark:text-gray-400 rounded border border-slate-200 dark:border-gray-600">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 dark:border-gray-700">
            <div className="px-2 pb-2 pt-2 bg-slate-50 dark:bg-gray-900">
              <button
                onClick={() => setShowAddTopic(true)}
                className="flex items-center gap-1 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 mb-2 text-xs font-medium shadow-sm transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Topic
              </button>

              {showAddTopic && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white dark:bg-gray-800 p-2.5 rounded mb-2 border border-slate-200 dark:border-gray-700 shadow-sm">
                  <h5 className="text-xs font-semibold mb-2 text-slate-800 dark:text-gray-100">New Topic</h5>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Topic Name *</label>
                      <input
                        type="text"
                        placeholder="Enter topic name"
                        value={newTopic.topicName}
                        onChange={(e) => setNewTopic({ ...newTopic, topicName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Difficulty Level</label>
                      <select
                        value={newTopic.difficulty}
                        onChange={(e) => setNewTopic({ ...newTopic, difficulty: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <option value="easy">Easy</option>
                        <option value="easy-medium">Easy-Medium</option>
                        <option value="medium">Medium</option>
                        <option value="medium-hard">Medium-Hard</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Video Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/video"
                        value={newTopic.videoLink || ''}
                        onChange={(e) => setNewTopic({ ...newTopic, videoLink: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Notes PDF (Optional)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setNewTopic({ ...newTopic, notesPDF: e.target.files[0] })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-sky-50 dark:file:bg-sky-900/40 file:text-sky-600 dark:file:text-sky-400 hover:file:bg-sky-100 dark:hover:file:bg-sky-900/60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Question PDF (Optional)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setNewTopic({ ...newTopic, questionPDF: e.target.files[0] })}
                        className="w-full px-2 py-1 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-sky-50 dark:file:bg-sky-900/40 file:text-sky-600 dark:file:text-sky-400 hover:file:bg-sky-100 dark:hover:file:bg-sky-900/60"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={handleAddTopic} className="flex items-center gap-1 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 text-xs font-medium shadow-sm transition-colors">
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTopic(false);
                        setNewTopic({ topicName: '', difficulty: 'medium', videoLink: '', notesPDF: null, questionPDF: null });
                      }}
                      className="flex items-center gap-1 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2.5 py-1.5 rounded hover:bg-slate-300 dark:hover:bg-gray-500 text-xs font-medium transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {chapter.topics && chapter.topics.length > 0 ? (
                <Reorder.Group axis="y" values={chapter.topics} onReorder={handleReorderTopics} className="space-y-1.5">
                  {chapter.topics.map((topic) => (
                    <TopicCard
                      key={topic._id}
                      topic={topic}
                      semesterId={semesterId}
                      subjectId={subjectId}
                      chapterId={chapter._id}
                      onDelete={() => handleDeleteTopic(topic._id)}
                      loadSemesters={loadSemesters}
                      semesters={semesters}
                      setSemesters={setSemesters}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 mb-1.5">
                    <BookOpen className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                  </div>
                  <p className="text-slate-500 dark:text-gray-400 text-xs">No topics added yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function TopicCard({ topic, semesterId, subjectId, chapterId, onDelete, loadSemesters }) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    topicName: topic.topicName, 
    difficulty: topic.difficultyLevel || topic.difficulty, 
    videoLink: topic.topicVideoLink || '',
    notesPDF: null,
    questionPDF: null
  });

  const handleUpdate = async () => {
    if (!editData.topicName.trim()) {
      toast.error('Topic name is required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('topicName', editData.topicName);
      formData.append('difficulty', editData.difficulty);
      if (editData.videoLink) formData.append('topicVideoLink', editData.videoLink);
      if (editData.notesPDF) formData.append('notesPDF', editData.notesPDF);
      if (editData.questionPDF) formData.append('questionPDF', editData.questionPDF);
      
      await api.updateTopic(semesterId, subjectId, chapterId, topic._id, formData);
      toast.success('Topic updated');
      setIsEditing(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to update topic:', err);
      toast.error('Failed to update topic');
    }
  };

  return (
    <Reorder.Item value={topic} className="bg-white dark:bg-gray-800 p-2 rounded border border-slate-200 dark:border-gray-700 hover:border-slate-300 dark:hover:border-gray-600 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-1.5 flex-1">
          <GripVertical 
            className="w-3 h-3 text-slate-400 dark:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 mt-0.5 hover:text-slate-600 dark:hover:text-gray-400" 
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Topic Name *</label>
                  <input
                    type="text"
                    placeholder="Enter topic name"
                    value={editData.topicName}
                    onChange={(e) => setEditData({ ...editData, topicName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Difficulty Level</label>
                  <select
                    value={editData.difficulty}
                    onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="easy-medium">Easy-Medium</option>
                    <option value="medium">Medium</option>
                    <option value="medium-hard">Medium-Hard</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Video Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/video"
                    value={editData.videoLink}
                    onChange={(e) => setEditData({ ...editData, videoLink: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Notes PDF (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setEditData({ ...editData, notesPDF: e.target.files[0] })}
                    className="w-full px-2 py-1 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-sky-50 dark:file:bg-sky-900/40 file:text-sky-600 dark:file:text-sky-400 hover:file:bg-sky-100 dark:hover:file:bg-sky-900/60"
                  />
                  {topic.notesPDF && (
                    <a href={topic.notesPDF} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline mt-0.5 inline-block font-medium">
                      View current PDF
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-gray-300 mb-0.5">Question PDF (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setEditData({ ...editData, questionPDF: e.target.files[0] })}
                    className="w-full px-2 py-1 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs text-slate-800 dark:text-gray-100 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-sky-50 dark:file:bg-sky-900/40 file:text-sky-600 dark:file:text-sky-400 hover:file:bg-sky-100 dark:hover:file:bg-sky-900/60"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleUpdate} className="flex items-center gap-1 bg-sky-500 text-white px-2.5 py-1.5 rounded hover:bg-sky-600 text-xs font-medium shadow-sm transition-colors">
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-slate-200 dark:bg-gray-600 text-slate-700 dark:text-gray-200 px-2.5 py-1.5 rounded hover:bg-slate-300 dark:hover:bg-gray-500 text-xs font-medium transition-colors">
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="font-semibold text-slate-800 dark:text-gray-100 text-sm">{topic.topicName}</h5>
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${difficultyColors[topic.difficulty]}`}>
                    {topic.difficulty}
                  </span>
                </div>
                {topic.links && topic.links.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {topic.links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline text-xs font-medium"
                      >
                        <LinkIcon className="w-3 h-3" />
                        Link {i + 1}
                      </a>
                    ))}
                  </div>
                )}
                {topic.questionPDF && (
                  <a
                    href={topic.questionPDF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline mt-2 text-xs font-medium"
                  >
                    <FileText className="w-3 h-3" />
                    Question PDF
                  </a>
                )}
                {topic.notesPDF && (
                  <a
                    href={topic.notesPDF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline mt-2 text-xs font-medium"
                  >
                    <FileText className="w-3 h-3" />
                    Notes PDF
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} className="p-1 bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 rounded hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={onDelete} className="p-1 bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}
