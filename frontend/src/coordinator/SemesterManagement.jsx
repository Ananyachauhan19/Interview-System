import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { api } from '../utils/api';
import {
  BookOpen, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Save, X,
  Star, Upload, Link as LinkIcon, FileText, GripVertical, Video, File, Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';

const difficultyColors = {
  'easy': 'bg-green-100 text-green-800',
  'easy-medium': 'bg-lime-100 text-lime-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'medium-hard': 'bg-orange-100 text-orange-800',
  'hard': 'bg-red-100 text-red-800'
};

export default function SemesterManagement() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSemesters, setExpandedSemesters] = useState(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [editingSemester, setEditingSemester] = useState(null);
  const [showAddSemester, setShowAddSemester] = useState(false);
  const [newSemester, setNewSemester] = useState({ semesterName: '', semesterDescription: '' });

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const data = await api.listSemesters();
      setSemesters(data.semesters || []);
    } catch (err) {
      console.error('Failed to load semesters:', err);
      toast.error('Failed to load semesters');
    } finally {
      setLoading(false);
    }
  };

  const toggleSemester = (semesterId) => {
    const newSet = new Set(expandedSemesters);
    if (newSet.has(semesterId)) newSet.delete(semesterId);
    else newSet.add(semesterId);
    setExpandedSemesters(newSet);
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
      toast.error('Semester name is required');
      return;
    }
    try {
      await api.createSemester(newSemester.semesterName, newSemester.semesterDescription);
      toast.success('Semester added successfully');
      setNewSemester({ semesterName: '', semesterDescription: '' });
      setShowAddSemester(false);
      loadSemesters();
    } catch (err) {
      console.error('Failed to add semester:', err);
      toast.error(err.message || 'Failed to add semester');
    }
  };

  const handleDeleteSemester = async (semesterId) => {
    if (!confirm('Delete this semester and all its subjects/chapters/topics?')) return;
    try {
      await api.deleteSemester(semesterId);
      toast.success('Semester deleted');
      loadSemesters();
    } catch (err) {
      console.error('Failed to delete semester:', err);
      toast.error('Failed to delete semester');
    }
  };

  const handleUpdateSemester = async (semesterId) => {
    if (!editingSemester.semesterName.trim()) {
      toast.error('Semester name is required');
      return;
    }
    try {
      await api.updateSemester(semesterId, {
        semesterName: editingSemester.semesterName,
        semesterDescription: editingSemester.semesterDescription
      });
      toast.success('Semester updated');
      setEditingSemester(null);
      loadSemesters();
    } catch (err) {
      console.error('Failed to update semester:', err);
      toast.error('Failed to update semester');
    }
  };

  const handleReorderSemesters = async (newOrder) => {
    setSemesters(newOrder);
    try {
      const semesterIds = newOrder.map(s => s._id);
      await api.reorderSemesters(semesterIds);
    } catch (err) {
      console.error('Failed to reorder semesters:', err);
      toast.error('Failed to save order');
      loadSemesters();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-lg">Loading semesters...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pt-20 pb-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">Semester Management</h1>
          </div>
          <button
            onClick={() => setShowAddSemester(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add Semester
          </button>
        </div>

        {showAddSemester && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-5 rounded-lg shadow-md mb-5"
          >
            <h3 className="text-lg font-semibold mb-3">New Semester</h3>
            <input
              type="text"
              placeholder="Semester name (e.g., Semester 1)"
              value={newSemester.semesterName}
              onChange={(e) => setNewSemester({ ...newSemester, semesterName: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg mb-3"
            />
            <textarea
              placeholder="Description (optional)"
              value={newSemester.semesterDescription}
              onChange={(e) => setNewSemester({ ...newSemester, semesterDescription: e.target.value })}
              className="w-full px-3 py-2.5 border rounded-lg mb-3"
              rows="2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddSemester}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddSemester(false);
                  setNewSemester({ semesterName: '', semesterDescription: '' });
                }}
                className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        <Reorder.Group axis="y" values={semesters} onReorder={handleReorderSemesters} className="space-y-4">
          {semesters.map((semester) => (
            <SemesterCard
              key={semester._id}
              semester={semester}
              isExpanded={expandedSemesters.has(semester._id)}
              onToggle={() => toggleSemester(semester._id)}
              onDelete={() => handleDeleteSemester(semester._id)}
              isEditing={editingSemester && editingSemester._id === semester._id}
              editingData={editingSemester}
              onEdit={() => setEditingSemester(semester)}
              onSaveEdit={() => handleUpdateSemester(semester._id)}
              onCancelEdit={() => setEditingSemester(null)}
              onEditChange={setEditingSemester}
              loadSemesters={loadSemesters}
              expandedSubjects={expandedSubjects}
              toggleSubject={toggleSubject}
              expandedChapters={expandedChapters}
              toggleChapter={toggleChapter}
              semesters={semesters}
              setSemesters={setSemesters}
            />
          ))}
        </Reorder.Group>

        {semesters.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-lg">No semesters yet. Click "Add Semester" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SemesterCard({
  semester, isExpanded, onToggle, onDelete, isEditing, editingData, onEdit,
  onSaveEdit, onCancelEdit, onEditChange, loadSemesters,
  expandedSubjects, toggleSubject, expandedChapters, toggleChapter,
  semesters, setSemesters
}) {
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ subjectName: '', subjectDescription: '' });

  const handleAddSubject = async () => {
    if (!newSubject.subjectName.trim()) {
      toast.error('Subject name is required');
      return;
    }
    try {
      await api.addSubject(semester._id, newSubject.subjectName, newSubject.subjectDescription);
      toast.success('Subject added');
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
    // Update local state immediately for smooth UI
    const updatedSemesters = semesters.map(s => 
      s._id === semester._id ? { ...s, subjects: newOrder } : s
    );
    setSemesters(updatedSemesters);
    
    try {
      const subjectIds = newOrder.map(s => s._id);
      await api.reorderSubjects(semester._id, subjectIds);
    } catch (err) {
      console.error('Failed to reorder subjects:', err);
      toast.error('Failed to save order');
      loadSemesters();
    }
  };

  return (
    <Reorder.Item value={semester} className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div 
        className="p-5 bg-gradient-to-r from-indigo-500 to-purple-600 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <GripVertical 
              className="w-6 h-6 text-white opacity-70 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1" 
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingData.semesterName}
                    onChange={(e) => onEditChange({ ...editingData, semesterName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                  />
                  <textarea
                    value={editingData.semesterDescription || ''}
                    onChange={(e) => onEditChange({ ...editingData, semesterDescription: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows="2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={onSaveEdit}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="flex items-center gap-2 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white mb-1">{semester.semesterName}</h2>
                  {semester.semesterDescription && (
                    <p className="text-indigo-100 text-sm">{semester.semesterDescription}</p>
                  )}
                  <p className="text-indigo-200 text-xs mt-1">
                    {semester.subjects?.length || 0} subject{semester.subjects?.length !== 1 ? 's' : ''}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
            {!isEditing && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 bg-white/20 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="p-2 bg-white/20 text-white rounded-lg">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 bg-gray-50">
              <button
                onClick={() => setShowAddSubject(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-3"
              >
                <Plus className="w-4 h-4" />
                Add Subject
              </button>

              {showAddSubject && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white p-4 rounded-lg shadow mb-3"
                >
                  <h4 className="text-base font-semibold mb-2">New Subject</h4>
                  <input
                    type="text"
                    placeholder="Subject name"
                    value={newSubject.subjectName}
                    onChange={(e) => setNewSubject({ ...newSubject, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg mb-2"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newSubject.subjectDescription}
                    onChange={(e) => setNewSubject({ ...newSubject, subjectDescription: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg mb-2"
                    rows="2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSubject}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubject(false);
                        setNewSubject({ subjectName: '', subjectDescription: '' });
                      }}
                      className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {semester.subjects && semester.subjects.length > 0 ? (
                <Reorder.Group
                  axis="y"
                  values={semester.subjects}
                  onReorder={handleReorderSubjects}
                  className="space-y-3"
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
                <p className="text-gray-500 text-center py-6">No subjects yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function SubjectCard({ subject, semesterId, isExpanded, onToggle, onDelete, loadSemesters, expandedChapters, toggleChapter, semesters, setSemesters }) {
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
    <Reorder.Item value={subject} className="bg-white rounded-lg shadow border-2 border-gray-200">
      <div className="p-4 bg-blue-50 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <GripVertical 
              className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1" 
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editData.subjectName}
                    onChange={(e) => setEditData({ ...editData, subjectName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-semibold"
                  />
                  <textarea
                    value={editData.subjectDescription || ''}
                    onChange={(e) => setEditData({ ...editData, subjectDescription: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    rows="2"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleUpdate} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400">
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-800">{subject.subjectName}</h3>
                  </div>
                  {subject.subjectDescription && <p className="text-gray-600 mt-1 text-sm">{subject.subjectDescription}</p>}
                  <p className="text-gray-500 text-xs mt-1">{subject.chapters?.length || 0} chapter{subject.chapters?.length !== 1 ? 's' : ''}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {!isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={onDelete} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="p-1.5 bg-gray-100 text-gray-600 rounded-lg">
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4">
              <button
                onClick={() => setShowAddChapter(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 mb-3 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Chapter
              </button>

              {showAddChapter && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-gray-50 p-3 rounded-lg mb-3">
                  <h4 className="text-sm font-semibold mb-2">New Chapter</h4>
                  <input
                    type="text"
                    placeholder="Chapter name"
                    value={newChapter.chapterName}
                    onChange={(e) => setNewChapter({ ...newChapter, chapterName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg mb-2 text-sm"
                  />
                  <div className="mb-3">
                    <label className="block text-xs font-medium mb-1">Importance Level</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          onClick={() => setNewChapter({ ...newChapter, importanceLevel: level })}
                          className={`p-1 ${level <= newChapter.importanceLevel ? 'text-yellow-500' : 'text-gray-300'}`}
                        >
                          <Star className="w-5 h-5" fill={level <= newChapter.importanceLevel ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddChapter} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowAddChapter(false);
                        setNewChapter({ chapterName: '', importanceLevel: 3 });
                      }}
                      className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {subject.chapters && subject.chapters.length > 0 ? (
                <Reorder.Group axis="y" values={subject.chapters} onReorder={handleReorderChapters} className="space-y-2">
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
                <p className="text-gray-500 text-center py-6">No chapters yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function ChapterCard({ chapter, semesterId, subjectId, isExpanded, onToggle, onDelete, loadSemesters, semesters, setSemesters }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...chapter });
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ topicName: '', difficulty: 'medium', videoLink: '', notesLink: '', questionPDF: null });

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
    try {
      console.log('[handleAddTopic] Creating FormData...');
      const formData = new FormData();
      formData.append('topicName', newTopic.topicName);
      formData.append('difficulty', newTopic.difficulty);
      if (newTopic.videoLink) formData.append('topicVideoLink', newTopic.videoLink);
      if (newTopic.notesLink) formData.append('notesLink', newTopic.notesLink);
      if (newTopic.questionPDF) {
        console.log('[handleAddTopic] Adding PDF file:', newTopic.questionPDF.name);
        formData.append('questionPDF', newTopic.questionPDF);
      }
      
      console.log('[handleAddTopic] Calling API...');
      await api.addTopic(semesterId, subjectId, chapter._id, formData);
      console.log('[handleAddTopic] Topic added successfully');
      toast.success('Topic added');
      setNewTopic({ topicName: '', difficulty: 'medium', videoLink: '', notesLink: '', questionPDF: null });
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
    <Reorder.Item value={chapter} className="bg-gray-50 rounded-lg border border-gray-300">
      <div className="p-3 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <GripVertical 
              className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1" 
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editData.chapterName}
                    onChange={(e) => setEditData({ ...editData, chapterName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-semibold text-sm"
                  />
                  <div>
                    <label className="block text-xs font-medium mb-1">Importance Level</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <button
                          key={level}
                          onClick={() => setEditData({ ...editData, importanceLevel: level })}
                          className={`p-1 ${level <= editData.importanceLevel ? 'text-yellow-500' : 'text-gray-300'}`}
                        >
                          <Star className="w-4 h-4" fill={level <= editData.importanceLevel ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleUpdate} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 text-sm">
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="text-base font-bold text-gray-800">{chapter.chapterName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < chapter.importanceLevel ? 'text-yellow-500' : 'text-gray-300'}`}
                        fill={i < chapter.importanceLevel ? 'currentColor' : 'none'}
                      />
                    ))}
                    <span className="text-xs text-gray-500">({chapter.topics?.length || 0} topics)</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {!isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={onDelete} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
            <div className="p-1 bg-gray-200 text-gray-600 rounded">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3">
              <button
                onClick={() => setShowAddTopic(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 mb-2 text-sm"
              >
                <Plus className="w-3 h-3" />
                Add Topic
              </button>

              {showAddTopic && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-white p-3 rounded-lg mb-2 shadow">
                  <h5 className="text-sm font-semibold mb-3">New Topic</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Topic Name *</label>
                      <input
                        type="text"
                        placeholder="Enter topic name"
                        value={newTopic.topicName}
                        onChange={(e) => setNewTopic({ ...newTopic, topicName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty Level</label>
                      <select
                        value={newTopic.difficulty}
                        onChange={(e) => setNewTopic({ ...newTopic, difficulty: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="easy">Easy</option>
                        <option value="easy-medium">Easy-Medium</option>
                        <option value="medium">Medium</option>
                        <option value="medium-hard">Medium-Hard</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Video Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/video"
                        value={newTopic.videoLink || ''}
                        onChange={(e) => setNewTopic({ ...newTopic, videoLink: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://example.com/notes"
                        value={newTopic.notesLink || ''}
                        onChange={(e) => setNewTopic({ ...newTopic, notesLink: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Question PDF (Optional)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setNewTopic({ ...newTopic, questionPDF: e.target.files[0] })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleAddTopic} className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm">
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTopic(false);
                        setNewTopic({ topicName: '', difficulty: 'medium', videoLink: '', notesLink: '', questionPDF: null });
                      }}
                      className="flex items-center gap-1 bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400 text-sm"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {chapter.topics && chapter.topics.length > 0 ? (
                <Reorder.Group axis="y" values={chapter.topics} onReorder={handleReorderTopics} className="space-y-2">
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
                <p className="text-gray-500 text-center py-3 text-xs">No topics yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function TopicCard({ topic, semesterId, subjectId, chapterId, onDelete, loadSemesters, semesters, setSemesters }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    topicName: topic.topicName, 
    difficulty: topic.difficultyLevel || topic.difficulty, 
    videoLink: topic.topicVideoLink || '',
    notesLink: topic.notesLink || '',
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
      if (editData.notesLink) formData.append('notesLink', editData.notesLink);
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
    <Reorder.Item value={topic} className="bg-white p-2.5 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <GripVertical 
            className="w-3 h-3 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0 mt-1" 
            onPointerDown={(e) => e.stopPropagation()}
          />
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Topic Name *</label>
                  <input
                    type="text"
                    placeholder="Enter topic name"
                    value={editData.topicName}
                    onChange={(e) => setEditData({ ...editData, topicName: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty Level</label>
                  <select
                    value={editData.difficulty}
                    onChange={(e) => setEditData({ ...editData, difficulty: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  >
                    <option value="easy">Easy</option>
                    <option value="easy-medium">Easy-Medium</option>
                    <option value="medium">Medium</option>
                    <option value="medium-hard">Medium-Hard</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Video Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/video"
                    value={editData.videoLink}
                    onChange={(e) => setEditData({ ...editData, videoLink: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/notes"
                    value={editData.notesLink}
                    onChange={(e) => setEditData({ ...editData, notesLink: e.target.value })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Question PDF (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setEditData({ ...editData, questionPDF: e.target.files[0] })}
                    className="w-full px-2 py-1 border rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdate} className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs">
                    <Save className="w-3 h-3" />
                    Save
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex items-center gap-1 bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 text-xs">
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="font-semibold text-gray-800 text-sm">{topic.topicName}</h5>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[topic.difficulty]}`}>
                    {topic.difficulty}
                  </span>
                </div>
                {topic.links && topic.links.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topic.links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
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
                    className="flex items-center gap-1 text-red-600 hover:underline mt-1 text-xs"
                  >
                    <FileText className="w-3 h-3" />
                    View PDF
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={onDelete} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}
