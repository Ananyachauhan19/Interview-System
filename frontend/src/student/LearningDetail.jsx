import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Video,
  FileText,
  FileQuestion,
  Star,
  X,
  ExternalLink,
  Menu,
  CheckCircle2,
  Circle,
  ArrowLeft
} from 'lucide-react';
import { api } from '../utils/api';
import toast from 'react-hot-toast';

// Convert YouTube URL to embed format
const convertToEmbedUrl = (url) => {
  if (!url) return url;
  
  // Already an embed URL
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Standard YouTube URL: https://www.youtube.com/watch?v=VIDEO_ID
  const standardMatch = url.match(/[?&]v=([^&]+)/);
  if (standardMatch) {
    return `https://www.youtube.com/embed/${standardMatch[1]}`;
  }
  
  // Short YouTube URL: https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }
  
  // Return original URL if not YouTube
  return url;
};

export default function LearningDetail() {
  const { semester, subject, teacherId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { semesterId, subjectId, coordinatorName: initialCoordinatorName, coordinatorId: initialCoordinatorId } = location.state || {};

  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectDetails, setSubjectDetails] = useState(null);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentCoordinatorId, setCurrentCoordinatorId] = useState(initialCoordinatorId);
  const [currentCoordinatorName, setCurrentCoordinatorName] = useState(initialCoordinatorName);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalType, setModalType] = useState(null); // 'video', 'notes', 'pdf'
  
  // Progress tracking
  const [progress, setProgress] = useState({});

  useEffect(() => {
    loadCoordinatorSubjects();
  }, [teacherId]);

  useEffect(() => {
    console.log('[LearningDetail] Initial state from navigation:');
    console.log('  - semesterId:', semesterId);
    console.log('  - subjectId:', subjectId);
    console.log('  - coordinatorName:', initialCoordinatorName);
    console.log('  - coordinatorId:', initialCoordinatorId);
    if (semesterId && subjectId) {
      loadSubjectDetails(semesterId, subjectId);
      setSelectedSubject({ semesterId, subjectId });
      loadSubjectProgress(subjectId);
    }
  }, [semesterId, subjectId]);

  const loadCoordinatorSubjects = async () => {
    try {
      setLoading(true);
      const data = await api.getCoordinatorSubjects(teacherId);
      setAllSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const loadSubjectDetails = async (semId, subjId) => {
    try {
      const data = await api.getSubjectDetails(semId, subjId);
      console.log('[LearningDetail] Subject details loaded:', data);
      console.log('[LearningDetail] Coordinator Name:', data.coordinatorName);
      setSubjectDetails(data);
      // Update current coordinator info from loaded data
      if (data.coordinatorId) {
        setCurrentCoordinatorId(data.coordinatorId);
        console.log('[LearningDetail] Set coordinator ID:', data.coordinatorId);
      }
      if (data.coordinatorName) {
        setCurrentCoordinatorName(data.coordinatorName);
        console.log('[LearningDetail] Set coordinator name:', data.coordinatorName);
      }
    } catch (error) {
      console.error('Error loading subject details:', error);
      toast.error('Failed to load subject details');
    }
  };

  const loadSubjectProgress = async (subjId) => {
    try {
      const data = await api.getSubjectProgress(subjId);
      setProgress(prev => ({
        ...prev,
        [subjId]: data
      }));
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const handleSubjectClick = (subject) => {
    setSelectedSubject({ semesterId: subject.semesterId, subjectId: subject.subjectId });
    loadSubjectDetails(subject.semesterId, subject.subjectId);
    loadSubjectProgress(subject.subjectId);
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const openModal = async (type, content, topic) => {
    setModalType(type);
    // Convert YouTube URLs to embed format
    const embedContent = type === 'video' ? convertToEmbedUrl(content) : content;
    setModalContent(embedContent);
    setModalOpen(true);

    // Start backend tracking if it's a video (no frontend timer needed)
    if (type === 'video') {
      try {
        // Use currentCoordinatorId which is reliably set from state or loaded data
        const coordId = currentCoordinatorId || subjectDetails?.coordinatorId;
        
        if (!coordId) {
          console.error('Coordinator ID not available');
          toast.error('Unable to track video progress');
          return;
        }

        const result = await api.startVideoTracking(
          topic._id,
          subjectDetails.semesterId,
          subjectDetails.subjectId,
          topic.chapterId,
          coordId
        );
        console.log('[Video] Backend tracking started and completed:', result);
        
        // Refresh progress immediately after tracking is complete
        await loadSubjectProgress(subjectDetails.subjectId);
        await loadSubjectDetails(subjectDetails.semesterId, subjectDetails.subjectId);
        toast.success('Topic marked as watched! 🎉');
      } catch (error) {
        console.error('Error starting video tracking:', error);
        toast.error('Failed to start video tracking');
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
    setModalType(null);
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getDifficultyBadge = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      medium: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      hard: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[difficulty] || colors.medium}`}>
        {difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : 'Medium'}
      </span>
    );
  };

  const isTopicCompleted = (topicId) => {
    if (!subjectDetails?.subjectId || !progress[subjectDetails.subjectId]) {
      return false;
    }
    const progressRecords = progress[subjectDetails.subjectId].progressRecords || [];
    const topicProgress = progressRecords.find(p => p.topicId === topicId);
    return topicProgress?.completed || false;
  };

  const getSubjectProgressPercentage = (subjId) => {
    return progress[subjId]?.percentage || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pt-16">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: sidebarOpen ? 280 : 0 }}
          className="bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm"
        >
          <div className="h-full overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-gray-700">
              <h2 className="text-base font-bold text-slate-800 dark:text-gray-100">My Subjects</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-2.5">
              {allSubjects.map((subject) => {
                const isSelected = selectedSubject?.subjectId === subject.subjectId;
                const progressPercent = getSubjectProgressPercentage(subject.subjectId);

                return (
                  <div key={subject.subjectId}>
                    <button
                      onClick={() => handleSubjectClick(subject)}
                      className={`w-full text-left p-3 rounded-lg transition-all border ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-300 dark:border-sky-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-gray-700 border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600 hover:border-slate-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-sky-100 dark:bg-sky-800' : 'bg-slate-200 dark:bg-gray-600'
                        }`}>
                          <BookOpen className={`w-4 h-4 ${
                            isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-gray-400'
                          }`} />
                        </div>
                        <span className={`font-semibold text-sm truncate ${
                          isSelected ? 'text-slate-800 dark:text-gray-100' : 'text-slate-700 dark:text-gray-300'
                        }`}>
                          {subject.subjectName}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden mb-1.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full bg-sky-500 dark:bg-sky-600 rounded-full"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-slate-600 dark:text-gray-400">{progressPercent}% Complete</p>
                        {progressPercent === 100 && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-900">
          {/* Toggle Sidebar Button */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 top-20 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 transition-all"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-gray-300" />
            </button>
          )}

          {subjectDetails ? (
            <div className="max-w-5xl mx-auto p-6">
              {/* Header */}
              <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                    {subjectDetails.subjectName}
                  </h1>
                  <button
                    onClick={() => navigate('/student/learning')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400 mb-3">{subjectDetails.subjectDescription}</p>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-2 py-1 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded font-medium">
                    Instructor: {currentCoordinatorName || subjectDetails?.coordinatorName || initialCoordinatorName || 'Teacher'}
                  </span>
                </div>
              </div>

              {/* Chapters */}
              <div className="space-y-3">
                {subjectDetails.chapters.map((chapter, chapterIdx) => (
                  <div key={chapter._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
                    {/* Chapter Header */}
                    <div
                      onClick={() => toggleChapter(chapter._id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          {expandedChapters[chapter._id] ? (
                            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                          )}
                          <h3 className="font-bold text-sm text-slate-800 dark:text-gray-100">
                            Chapter {chapterIdx + 1}: {chapter.chapterName}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < (chapter.importanceLevel || 3)
                                  ? 'text-yellow-500 fill-yellow-500'
                                  : 'text-slate-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-400 rounded">
                        {chapter.topics.length} {chapter.topics.length === 1 ? 'Topic' : 'Topics'}
                      </span>
                    </div>

                    {/* Topics */}
                    <AnimatePresence>
                      {expandedChapters[chapter._id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-200 dark:border-gray-700"
                        >
                          <div className="p-4 bg-slate-50 dark:bg-gray-900">
                            <div className="space-y-2">
                              {chapter.topics.map((topic) => (
                                <div
                                  key={topic._id}
                                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 hover:border-sky-300 dark:hover:border-sky-600 transition-all"
                                >
                                  <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                                    {isTopicCompleted(topic._id) ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-slate-400 dark:text-gray-500 flex-shrink-0" />
                                    )}
                                    <div className="text-slate-800 dark:text-gray-200 font-semibold text-sm flex-1 truncate">
                                      {topic.topicName}
                                    </div>
                                    {getDifficultyBadge(topic.difficultyLevel)}
                                  </div>

                                  <div className="flex items-center space-x-1.5 ml-3 flex-shrink-0">
                                    {/* Video Button */}
                                    {topic.topicVideoLink && (
                                      <button
                                        onClick={() => openModal('video', topic.topicVideoLink, { ...topic, chapterId: chapter._id })}
                                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                        title="Watch Video"
                                      >
                                        <Video className="w-4 h-4" />
                                      </button>
                                    )}

                                    {/* Notes Button */}
                                    {topic.notesPDF && (
                                      <button
                                        onClick={() => openModal('pdf', topic.notesPDF, topic)}
                                        className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors shadow-sm"
                                        title="View Notes PDF"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                    )}

                                    {/* PDF Button */}
                                    {topic.questionPDF && (
                                      <button
                                        onClick={() => openModal('pdf', topic.questionPDF, topic)}
                                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                                        title="View Questions"
                                      >
                                        <FileQuestion className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-8 h-8 text-slate-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-slate-600 dark:text-gray-400 font-medium">Select a subject to view details</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[65vw] max-w-4xl h-auto max-h-[85vh] bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <h3 className="text-base font-bold text-slate-800 dark:text-gray-100">
                  {modalType === 'video' && '📹 Video Lesson'}
                  {modalType === 'notes' && '📄 Study Notes'}
                  {modalType === 'pdf' && '📝 Practice Questions'}
                </h3>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => openInNewTab(modalContent)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={closeModal}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-hidden p-4 bg-slate-50 dark:bg-gray-900">
                {modalType === 'video' && (
                  <iframe
                    src={modalContent}
                    className="w-full h-[500px] rounded-lg border border-slate-200 dark:border-gray-700"
                    allowFullScreen
                    title="Video Player"
                  />
                )}
                {(modalType === 'notes' || modalType === 'pdf') && (
                  <iframe
                    src={modalContent}
                    className="w-full h-[500px] rounded-lg border border-slate-200 dark:border-gray-700"
                    title="Document Viewer"
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
