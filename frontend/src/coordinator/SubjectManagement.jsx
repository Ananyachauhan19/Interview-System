import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { api } from '../utils/api';
import {
  BookOpen, Plus, ChevronDown, ChevronRight, Edit2, Trash2, Save, X,
  Star, Upload, Link as LinkIcon, FileText, GripVertical, Video, File
} from 'lucide-react';
import { toast } from 'react-toastify';

const difficultyColors = {
  'easy': 'bg-green-100 text-green-800',
  'easy-medium': 'bg-lime-100 text-lime-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'medium-hard': 'bg-orange-100 text-orange-800',
  'hard': 'bg-red-100 text-red-800'
};

export default function SubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [editingSubject, setEditingSubject] = useState(null);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ subjectName: '', subjectDescription: '' });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await api.listSubjects();
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(subjectId)) {
      newSet.delete(subjectId);
    } else {
      newSet.add(subjectId);
    }
    setExpandedSubjects(newSet);
  };

  const toggleChapter = (chapterId) => {
    const newSet = new Set(expandedChapters);
    if (newSet.has(chapterId)) {
      newSet.delete(chapterId);
    } else {
      newSet.add(chapterId);
    }
    setExpandedChapters(newSet);
  };

  const handleAddSubject = async () => {
    if (!newSubject.subjectName.trim()) {
      toast.error('Subject name is required');
      return;
    }
    try {
      await api.createSubject(newSubject.subjectName, newSubject.subjectDescription);
      toast.success('Subject added successfully');
      setNewSubject({ subjectName: '', subjectDescription: '' });
      setShowAddSubject(false);
      loadSubjects();
    } catch (err) {
      console.error('Failed to add subject:', err);
      toast.error(err.message || 'Failed to add subject');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('Delete this subject and all its chapters/topics?')) return;
    try {
      await api.deleteSubject(subjectId);
      toast.success('Subject deleted');
      loadSubjects();
    } catch (err) {
      console.error('Failed to delete subject:', err);
      toast.error('Failed to delete subject');
    }
  };

  const handleUpdateSubject = async (subjectId) => {
    if (!editingSubject.subjectName.trim()) {
      toast.error('Subject name is required');
      return;
    }
    try {
      await api.updateSubject(subjectId, {
        subjectName: editingSubject.subjectName,
        subjectDescription: editingSubject.subjectDescription
      });
      toast.success('Subject updated');
      setEditingSubject(null);
      loadSubjects();
    } catch (err) {
      console.error('Failed to update subject:', err);
      toast.error('Failed to update subject');
    }
  };

  const handleReorderSubjects = async (newOrder) => {
    setSubjects(newOrder);
    try {
      const subjectIds = newOrder.map(s => s._id);
      await api.reorderSubjects(subjectIds);
    } catch (err) {
      console.error('Failed to reorder subjects:', err);
      toast.error('Failed to save new order');
      loadSubjects();
    }
  };

  const renderStars = (level) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < level ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const SubjectCard = ({ subject }) => {
    const isExpanded = expandedSubjects.has(subject._id);

    return (
      <motion.div
        layout
        className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden"
      >
        {/* Subject Header */}
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
          <GripVertical className="w-5 h-5 text-slate-400 cursor-move flex-shrink-0" />
          {editingSubject && editingSubject._id === subject._id ? (
            <div className="flex-1 flex flex-col gap-2">
              <input
                type="text"
                placeholder="Subject name *"
                value={editingSubject.subjectName}
                onChange={(e) => setEditingSubject({ ...editingSubject, subjectName: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={editingSubject.subjectDescription || ''}
                onChange={(e) => setEditingSubject({ ...editingSubject, subjectDescription: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateSubject(subject._id)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => toggleSubject(subject._id)}
                className="flex-1 flex items-center gap-3 text-left"
              >
                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <BookOpen className="w-6 h-6 text-emerald-600" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">{subject.subjectName}</h3>
                  {subject.subjectDescription && (
                    <p className="text-sm text-slate-600">{subject.subjectDescription}</p>
                  )}
                </div>
              </button>
              <button
                onClick={() => setEditingSubject({
                  _id: subject._id,
                  subjectName: subject.subjectName,
                  subjectDescription: subject.subjectDescription || ''
                })}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5 text-blue-600" />
              </button>
              <button
                onClick={() => handleDeleteSubject(subject._id)}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </>
          )}
        </div>

        {/* Chapters */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4"
            >
              <ChaptersList subject={subject} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const ChaptersList = ({ subject }) => {
    const [showAddChapter, setShowAddChapter] = useState(false);
    const [newChapter, setNewChapter] = useState({ chapterName: '', importanceLevel: 3 });
    const [editingChapter, setEditingChapter] = useState(null);
    const [chapters, setChapters] = useState(subject.chapters || []);

    useEffect(() => {
      setChapters(subject.chapters || []);
    }, [subject.chapters]);

    const handleAddChapter = async () => {
      if (!newChapter.chapterName.trim()) {
        toast.error('Chapter name is required');
        return;
      }
      try {
        await api.addChapter(subject._id, newChapter.chapterName, newChapter.importanceLevel);
        toast.success('Chapter added');
        setNewChapter({ chapterName: '', importanceLevel: 3 });
        setShowAddChapter(false);
        loadSubjects();
      } catch (err) {
        console.error('Failed to add chapter:', err);
        toast.error('Failed to add chapter');
      }
    };

    const handleUpdateChapter = async (chapterId) => {
      if (!editingChapter.chapterName.trim()) {
        toast.error('Chapter name is required');
        return;
      }
      try {
        await api.updateChapter(subject._id, chapterId, {
          chapterName: editingChapter.chapterName,
          importanceLevel: editingChapter.importanceLevel
        });
        toast.success('Chapter updated');
        setEditingChapter(null);
        loadSubjects();
      } catch (err) {
        console.error('Failed to update chapter:', err);
        toast.error('Failed to update chapter');
      }
    };

    const handleDeleteChapter = async (chapterId) => {
      if (!confirm('Delete this chapter and all its topics?')) return;
      try {
        await api.deleteChapter(subject._id, chapterId);
        toast.success('Chapter deleted');
        loadSubjects();
      } catch (err) {
        console.error('Failed to delete chapter:', err);
        toast.error('Failed to delete chapter');
      }
    };

    const handleReorderChapters = async (newOrder) => {
      setChapters(newOrder);
      try {
        const chapterIds = newOrder.map(c => c._id);
        await api.reorderChapters(subject._id, chapterIds);
      } catch (err) {
        console.error('Failed to reorder chapters:', err);
        toast.error('Failed to save chapter order');
        loadSubjects();
      }
    };

    return (
      <div className="space-y-3">
        <Reorder.Group axis="y" values={chapters} onReorder={handleReorderChapters} className="space-y-3">
          {chapters.map((chapter) => (
            <Reorder.Item key={chapter._id} value={chapter}>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-slate-50">
                  <GripVertical className="w-4 h-4 text-slate-400 cursor-move flex-shrink-0" />
                  {editingChapter && editingChapter._id === chapter._id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingChapter.chapterName}
                        onChange={(e) => setEditingChapter({ ...editingChapter, chapterName: e.target.value })}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <button
                            key={level}
                            onClick={() => setEditingChapter({ ...editingChapter, importanceLevel: level })}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                level <= editingChapter.importanceLevel
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handleUpdateChapter(chapter._id)}
                        className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingChapter(null)}
                        className="p-1.5 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => toggleChapter(chapter._id)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        {expandedChapters.has(chapter._id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{chapter.chapterName}</h4>
                          <div className="flex items-center gap-1 mt-1">
                            {renderStars(chapter.importanceLevel)}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => setEditingChapter({ _id: chapter._id, chapterName: chapter.chapterName, importanceLevel: chapter.importanceLevel })}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(chapter._id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>

                <AnimatePresence>
                  {expandedChapters.has(chapter._id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="p-3 bg-white"
                    >
                      <TopicsList subject={subject} chapter={chapter} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Add Chapter Button */}
        {showAddChapter ? (
          <div className="border border-emerald-300 rounded-lg p-3 bg-emerald-50">
            <input
              type="text"
              placeholder="Chapter name"
              value={newChapter.chapterName}
              onChange={(e) => setNewChapter({ ...newChapter, chapterName: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-2"
            />
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Importance:</span>
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setNewChapter({ ...newChapter, importanceLevel: level })}
                  className="p-1"
                >
                  <Star
                    className={`w-5 h-5 ${
                      level <= newChapter.importanceLevel
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddChapter}
                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Add Chapter
              </button>
              <button
                onClick={() => setShowAddChapter(false)}
                className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddChapter(true)}
            className="w-full px-3 py-2 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Chapter
          </button>
        )}
      </div>
    );
  };

  const TopicsList = ({ subject, chapter }) => {
    const [showAddTopic, setShowAddTopic] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [topics, setTopics] = useState(chapter.topics || []);
    const [newTopic, setNewTopic] = useState({
      topicName: '',
      topicVideoLink: '',
      notesLink: '',
      difficultyLevel: 'medium',
      questionPDF: null
    });

    useEffect(() => {
      setTopics(chapter.topics || []);
    }, [chapter.topics]);

    const handleAddTopic = async () => {
      if (!newTopic.topicName.trim()) {
        toast.error('Topic name is required');
        return;
      }
      try {
        const formData = new FormData();
        formData.append('topicName', newTopic.topicName);
        formData.append('difficultyLevel', newTopic.difficultyLevel);
        if (newTopic.topicVideoLink) formData.append('topicVideoLink', newTopic.topicVideoLink);
        if (newTopic.notesLink) formData.append('notesLink', newTopic.notesLink);
        if (newTopic.questionPDF) formData.append('questionPDF', newTopic.questionPDF);

        await api.addTopic(subject._id, chapter._id, formData);
        toast.success('Topic added');
        setNewTopic({
          topicName: '',
          topicVideoLink: '',
          notesLink: '',
          difficultyLevel: 'medium',
          questionPDF: null
        });
        setShowAddTopic(false);
        loadSubjects();
      } catch (err) {
        console.error('Failed to add topic:', err);
        toast.error('Failed to add topic');
      }
    };

    const handleUpdateTopic = async (topicId) => {
      if (!editingTopic.topicName.trim()) {
        toast.error('Topic name is required');
        return;
      }
      try {
        const formData = new FormData();
        formData.append('topicName', editingTopic.topicName);
        formData.append('difficultyLevel', editingTopic.difficultyLevel);
        if (editingTopic.topicVideoLink) formData.append('topicVideoLink', editingTopic.topicVideoLink);
        if (editingTopic.notesLink) formData.append('notesLink', editingTopic.notesLink);
        if (editingTopic.questionPDF) formData.append('questionPDF', editingTopic.questionPDF);

        await api.updateTopic(subject._id, chapter._id, topicId, formData);
        toast.success('Topic updated');
        setEditingTopic(null);
        loadSubjects();
      } catch (err) {
        console.error('Failed to update topic:', err);
        toast.error('Failed to update topic');
      }
    };

    const handleDeleteTopic = async (topicId) => {
      if (!confirm('Delete this topic?')) return;
      try {
        await api.deleteTopic(subject._id, chapter._id, topicId);
        toast.success('Topic deleted');
        loadSubjects();
      } catch (err) {
        console.error('Failed to delete topic:', err);
        toast.error('Failed to delete topic');
      }
    };

    const handleReorderTopics = async (newOrder) => {
      setTopics(newOrder);
      try {
        const topicIds = newOrder.map(t => t._id);
        await api.reorderTopics(subject._id, chapter._id, topicIds);
      } catch (err) {
        console.error('Failed to reorder topics:', err);
        toast.error('Failed to save topic order');
        loadSubjects();
      }
    };

    return (
      <div className="space-y-2">
        <Reorder.Group axis="y" values={topics} onReorder={handleReorderTopics} className="space-y-2">
          {topics.map((topic) => (
            <Reorder.Item key={topic._id} value={topic}>
              {editingTopic && editingTopic._id === topic._id ? (
                <div className="border border-blue-300 rounded-lg p-3 bg-blue-50 space-y-2">
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-move flex-shrink-0 mt-2" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Topic Name *</label>
                        <input
                          type="text"
                          placeholder="Enter topic name"
                          value={editingTopic.topicName}
                          onChange={(e) => setEditingTopic({ ...editingTopic, topicName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty Level</label>
                        <select
                          value={editingTopic.difficultyLevel}
                          onChange={(e) => setEditingTopic({ ...editingTopic, difficultyLevel: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                          <option value="easy">Easy</option>
                          <option value="easy-medium">Easy-Medium</option>
                          <option value="medium">Medium</option>
                          <option value="medium-hard">Medium-Hard</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Video Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://example.com/video"
                          value={editingTopic.topicVideoLink || ''}
                          onChange={(e) => setEditingTopic({ ...editingTopic, topicVideoLink: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes Link (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://example.com/notes"
                          value={editingTopic.notesLink || ''}
                          onChange={(e) => setEditingTopic({ ...editingTopic, notesLink: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Question PDF (Optional)</label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setEditingTopic({ ...editingTopic, questionPDF: e.target.files[0] })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateTopic(topic._id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      Update
                    </button>
                    <button
                      onClick={() => setEditingTopic(null)}
                      className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-2 border border-slate-200 rounded bg-white hover:bg-slate-50">
                  <GripVertical className="w-4 h-4 text-slate-400 cursor-move flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h5 className="font-medium text-slate-800">{topic.topicName}</h5>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded ${difficultyColors[topic.difficultyLevel]}`}>
                        {topic.difficultyLevel}
                      </span>
                      {topic.topicVideoLink && (
                        <a
                          href={topic.topicVideoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1 hover:bg-blue-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Video className="w-3 h-3" /> Video
                        </a>
                      )}
                      {topic.notesLink && (
                        <a
                          href={topic.notesLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded flex items-center gap-1 hover:bg-purple-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="w-3 h-3" /> Notes
                        </a>
                      )}
                      {topic.questionPDF && (
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded flex items-center gap-1">
                          <File className="w-3 h-3" /> PDF
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingTopic({
                      _id: topic._id,
                      topicName: topic.topicName,
                      topicVideoLink: topic.topicVideoLink || '',
                      notesLink: topic.notesLink || '',
                      difficultyLevel: topic.difficultyLevel,
                      questionPDF: null
                    })}
                    className="p-1 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                  >
                    <Edit2 className="w-3 h-3 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDeleteTopic(topic._id)}
                    className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              )}
            </Reorder.Item>
          ))}
        </Reorder.Group>

        {/* Add Topic Form */}
        {showAddTopic ? (
          <div className="border border-blue-300 rounded-lg p-3 bg-blue-50 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Topic Name *</label>
              <input
                type="text"
                placeholder="Enter topic name"
                value={newTopic.topicName}
                onChange={(e) => setNewTopic({ ...newTopic, topicName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty Level</label>
              <select
                value={newTopic.difficultyLevel}
                onChange={(e) => setNewTopic({ ...newTopic, difficultyLevel: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="easy">Easy</option>
                <option value="easy-medium">Easy-Medium</option>
                <option value="medium">Medium</option>
                <option value="medium-hard">Medium-Hard</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Video Link (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/video"
                value={newTopic.topicVideoLink}
                onChange={(e) => setNewTopic({ ...newTopic, topicVideoLink: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes Link (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/notes"
                value={newTopic.notesLink}
                onChange={(e) => setNewTopic({ ...newTopic, notesLink: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question PDF (Optional)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setNewTopic({ ...newTopic, questionPDF: e.target.files[0] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTopic}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Add Topic
              </button>
              <button
                onClick={() => setShowAddTopic(false)}
                className="px-3 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddTopic(true)}
            className="w-full px-2 py-1 border-2 border-dashed border-blue-300 rounded text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1 text-sm"
          >
            <Plus className="w-3 h-3" />
            Add Topic
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Subject Management</h1>
            <p className="text-slate-600 mt-1">Organize subjects, chapters, and topics</p>
          </div>
          <button
            onClick={() => setShowAddSubject(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Subject
          </button>
        </div>

        {/* Add Subject Form */}
        {showAddSubject && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg border border-emerald-200 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-slate-800 mb-4">New Subject</h2>
            <input
              type="text"
              placeholder="Subject name *"
              value={newSubject.subjectName}
              onChange={(e) => setNewSubject({ ...newSubject, subjectName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-3"
            />
            <textarea
              placeholder="Description (optional)"
              value={newSubject.subjectDescription}
              onChange={(e) => setNewSubject({ ...newSubject, subjectDescription: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={handleAddSubject}
                className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Create Subject
              </button>
              <button
                onClick={() => {
                  setShowAddSubject(false);
                  setNewSubject({ subjectName: '', subjectDescription: '' });
                }}
                className="px-4 py-3 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Subjects List with Drag and Drop */}
        {subjects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-md border border-slate-200">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No subjects yet. Add your first subject to get started!</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={subjects} onReorder={handleReorderSubjects} className="space-y-4">
            {subjects.map((subject) => (
              <Reorder.Item key={subject._id} value={subject}>
                <SubjectCard subject={subject} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
}
