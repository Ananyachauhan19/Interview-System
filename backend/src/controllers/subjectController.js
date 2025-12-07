import Semester from '../models/Subject.js';
import { HttpError } from '../utils/errors.js';
import { supabase } from '../utils/supabase.js';

// Get all semesters for a coordinator
export async function listSemesters(req, res) {
  try {
    const coordinatorId = req.user._id;
    const semesters = await Semester.find({ coordinatorId }).sort({ order: 1 }).lean();
    res.json({ count: semesters.length, semesters });
  } catch (err) {
    console.error('Error listing semesters:', err);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
}

// Create a new semester
export async function createSemester(req, res) {
  try {
    const { semesterName, semesterDescription } = req.body;
    if (!semesterName) throw new HttpError(400, 'Semester name is required');
    
    const coordinatorId = req.user._id;
    
    // Get max order for this coordinator
    const maxSemester = await Semester.findOne({ coordinatorId }).sort({ order: -1 }).select('order').lean();
    const order = maxSemester ? maxSemester.order + 1 : 0;
    
    const semester = await Semester.create({
      semesterName,
      semesterDescription,
      coordinatorId,
      order,
      subjects: []
    });
    
    res.status(201).json(semester);
  } catch (err) {
    console.error('Error creating semester:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: err.message || 'Failed to create semester' });
  }
}

// Update semester details
export async function updateSemester(req, res) {
  try {
    const { id } = req.params;
    const { semesterName, semesterDescription } = req.body;
    const coordinatorId = req.user._id;
    
    const semester = await Semester.findOne({ _id: id, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    if (semesterName !== undefined) semester.semesterName = semesterName;
    if (semesterDescription !== undefined) semester.semesterDescription = semesterDescription;
    
    await semester.save();
    res.json(semester);
  } catch (err) {
    console.error('Error updating semester:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to update semester' });
  }
}

// Delete a semester
export async function deleteSemester(req, res) {
  try {
    const { id } = req.params;
    const coordinatorId = req.user._id;
    
    const semester = await Semester.findOneAndDelete({ _id: id, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    res.json({ message: 'Semester deleted successfully' });
  } catch (err) {
    console.error('Error deleting semester:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to delete semester' });
  }
}

// Reorder semesters
export async function reorderSemesters(req, res) {
  try {
    const { semesterIds } = req.body;
    if (!Array.isArray(semesterIds)) throw new HttpError(400, 'semesterIds must be an array');
    
    const coordinatorId = req.user._id;
    
    const updates = semesterIds.map((id, index) => 
      Semester.updateOne({ _id: id, coordinatorId }, { order: index })
    );
    
    await Promise.all(updates);
    res.json({ message: 'Semesters reordered successfully' });
  } catch (err) {
    console.error('Error reordering semesters:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to reorder semesters' });
  }
}

// Add a subject to a semester
export async function addSubject(req, res) {
  try {
    const { semesterId } = req.params;
    const { subjectName, subjectDescription } = req.body;
    
    if (!subjectName) throw new HttpError(400, 'Subject name is required');
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    // Check for duplicate subject (case-insensitive)
    const normalizedName = subjectName.toLowerCase().trim();
    const duplicate = semester.subjects.find(s => 
      s.subjectName.toLowerCase().trim() === normalizedName
    );
    
    if (duplicate) {
      return res.status(400).json({ error: 'Subject already exists' });
    }
    
    const order = semester.subjects.length;
    semester.subjects.push({
      subjectName,
      subjectDescription,
      chapters: [],
      order
    });
    
    await semester.save();
    res.status(201).json(semester);
  } catch (err) {
    console.error('Error adding subject:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to add subject' });
  }
}

// Update a subject
export async function updateSubject(req, res) {
  try {
    const { semesterId, subjectId } = req.params;
    const { subjectName, subjectDescription } = req.body;
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    if (subjectName !== undefined) subject.subjectName = subjectName;
    if (subjectDescription !== undefined) subject.subjectDescription = subjectDescription;
    
    await semester.save();
    res.json(semester);
  } catch (err) {
    console.error('Error updating subject:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to update subject' });
  }
}

// Delete a subject
export async function deleteSubject(req, res) {
  try {
    const { semesterId, subjectId } = req.params;
    const coordinatorId = req.user._id;
    
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    semester.subjects.pull(subjectId);
    await semester.save();
    
    res.json({ message: 'Subject deleted successfully', semester });
  } catch (err) {
    console.error('Error deleting subject:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to delete subject' });
  }
}

// Reorder subjects within a semester
export async function reorderSubjects(req, res) {
  try {
    const { semesterId } = req.params;
    const { subjectIds } = req.body;
    
    if (!Array.isArray(subjectIds)) throw new HttpError(400, 'subjectIds must be an array');
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    subjectIds.forEach((id, index) => {
      const subject = semester.subjects.id(id);
      if (subject) subject.order = index;
    });
    
    semester.subjects.sort((a, b) => a.order - b.order);
    await semester.save();
    
    res.json(semester);
  } catch (err) {
    console.error('Error reordering subjects:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to reorder subjects' });
  }
}

// Add a chapter to a subject
export async function addChapter(req, res) {
  try {
    const { semesterId, subjectId } = req.params;
    const { chapterName, importanceLevel } = req.body;
    
    if (!chapterName) throw new HttpError(400, 'Chapter name is required');
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    const order = subject.chapters.length;
    subject.chapters.push({
      chapterName,
      importanceLevel: importanceLevel || 3,
      topics: [],
      order
    });
    
    await semester.save();
    res.status(201).json(semester);
  } catch (err) {
    console.error('Error adding chapter:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to add chapter' });
  }
}

// Update a chapter
export async function updateChapter(req, res) {
  try {
    const { semesterId, subjectId, chapterId } = req.params;
    const { chapterName, importanceLevel } = req.body;
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) throw new HttpError(404, 'Chapter not found');
    
    if (chapterName !== undefined) chapter.chapterName = chapterName;
    if (importanceLevel !== undefined) chapter.importanceLevel = importanceLevel;
    
    await semester.save();
    res.json(semester);
  } catch (err) {
    console.error('Error updating chapter:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to update chapter' });
  }
}

// Delete a chapter
export async function deleteChapter(req, res) {
  try {
    const { semesterId, subjectId, chapterId } = req.params;
    const coordinatorId = req.user._id;
    
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    subject.chapters.pull(chapterId);
    await semester.save();
    
    res.json({ message: 'Chapter deleted successfully', semester });
  } catch (err) {
    console.error('Error deleting chapter:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
}

// Reorder chapters within a subject
export async function reorderChapters(req, res) {
  try {
    const { semesterId, subjectId } = req.params;
    const { chapterIds } = req.body;
    
    if (!Array.isArray(chapterIds)) throw new HttpError(400, 'chapterIds must be an array');
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    chapterIds.forEach((id, index) => {
      const chapter = subject.chapters.id(id);
      if (chapter) chapter.order = index;
    });
    
    subject.chapters.sort((a, b) => a.order - b.order);
    await semester.save();
    
    res.json(semester);
  } catch (err) {
    console.error('Error reordering chapters:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
}

// Add a topic to a chapter
export async function addTopic(req, res) {
  try {
    console.log('[addTopic] Request params:', req.params);
    console.log('[addTopic] Request body:', req.body);
    console.log('[addTopic] Request files:', req.files);
    
    const { semesterId, subjectId, chapterId } = req.params;
    const { topicName, difficulty } = req.body;
    
    if (!topicName) throw new HttpError(400, 'Topic name is required');
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) throw new HttpError(404, 'Chapter not found');
    
    // Handle links - can be string, array, or multiple form fields
    let topicVideoLink = '';
    let notesLink = '';
    
    if (req.body.links) {
      const linksArray = Array.isArray(req.body.links) ? req.body.links : [req.body.links];
      topicVideoLink = linksArray[0] || '';
      notesLink = linksArray[1] || '';
    }
    
    let questionPDF = null;
    const pdfFile = req.files?.questionPDF?.[0];
    if (pdfFile) {
      const fileName = `${Date.now()}-${pdfFile.originalname}`;
      const { data, error } = await supabase.storage
        .from('question-pdfs')
        .upload(fileName, pdfFile.buffer, {
          contentType: pdfFile.mimetype
        });
      
      if (error) throw new HttpError(500, 'Failed to upload PDF');
      
      const { data: urlData } = supabase.storage
        .from('question-pdfs')
        .getPublicUrl(fileName);
      
      questionPDF = urlData.publicUrl;
    }
    
    const order = chapter.topics.length;
    chapter.topics.push({
      topicName,
      difficultyLevel: difficulty || 'medium',
      topicVideoLink,
      notesLink,
      questionPDF,
      order
    });
    
    console.log('[addTopic] Topic added, saving semester...');
    await semester.save();
    console.log('[addTopic] Semester saved successfully');
    res.status(201).json(semester);
  } catch (err) {
    console.error('[addTopic] Error:', err);
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to add topic', details: err.message });
  }
}

// Update a topic
export async function updateTopic(req, res) {
  try {
    const { semesterId, subjectId, chapterId, topicId } = req.params;
    const { topicName, difficultyLevel, topicVideoLink, notesLink } = req.body;
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) throw new HttpError(404, 'Chapter not found');
    
    const topic = chapter.topics.id(topicId);
    if (!topic) throw new HttpError(404, 'Topic not found');
    
    // Update fields
    if (topicName !== undefined) topic.topicName = topicName;
    if (difficultyLevel !== undefined) topic.difficultyLevel = difficultyLevel;
    if (topicVideoLink !== undefined) topic.topicVideoLink = topicVideoLink;
    if (notesLink !== undefined) topic.notesLink = notesLink;
    
    // Handle PDF upload if provided
    const pdfFile = req.files?.questionPDF?.[0];
    if (pdfFile) {
      const fileName = `${Date.now()}-${pdfFile.originalname}`;
      const { data, error } = await supabase.storage
        .from('question-pdfs')
        .upload(fileName, pdfFile.buffer, {
          contentType: pdfFile.mimetype
        });
      
      if (error) throw new HttpError(500, 'Failed to upload PDF');
      
      const { data: urlData } = supabase.storage
        .from('question-pdfs')
        .getPublicUrl(fileName);
      
      topic.questionPDF = urlData.publicUrl;
    }
    
    console.log('[updateTopic] Topic updated successfully');
    await semester.save();
    res.json(semester);
  } catch (err) {
    console.error('Error updating topic:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to update topic' });
  }
}

// Delete a topic
export async function deleteTopic(req, res) {
  try {
    const { semesterId, subjectId, chapterId, topicId } = req.params;
    const coordinatorId = req.user._id;
    
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) throw new HttpError(404, 'Chapter not found');
    
    chapter.topics.pull(topicId);
    await semester.save();
    
    res.json({ message: 'Topic deleted successfully', semester });
  } catch (err) {
    console.error('Error deleting topic:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to delete topic' });
  }
}

// Reorder topics within a chapter
export async function reorderTopics(req, res) {
  try {
    const { semesterId, subjectId, chapterId } = req.params;
    const { topicIds } = req.body;
    
    if (!Array.isArray(topicIds)) throw new HttpError(400, 'topicIds must be an array');
    
    const coordinatorId = req.user._id;
    const semester = await Semester.findOne({ _id: semesterId, coordinatorId });
    if (!semester) throw new HttpError(404, 'Semester not found');
    
    const subject = semester.subjects.id(subjectId);
    if (!subject) throw new HttpError(404, 'Subject not found');
    
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) throw new HttpError(404, 'Chapter not found');
    
    topicIds.forEach((id, index) => {
      const topic = chapter.topics.id(id);
      if (topic) topic.order = index;
    });
    
    chapter.topics.sort((a, b) => a.order - b.order);
    await semester.save();
    
    res.json(semester);
  } catch (err) {
    console.error('Error reordering topics:', err);
    if (err instanceof HttpError) throw err;
    res.status(500).json({ error: 'Failed to reorder topics' });
  }
}
