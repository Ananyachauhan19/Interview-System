import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';

dotenv.config({ path: './.env' });

const uri = process.env.MONGODB_URI;

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const students = await User.find({ role: 'student' })
      .select('name studentId semester')
      .limit(5)
      .lean();
    
    console.log('Sample students:');
    students.forEach(s => {
      console.log(`- ${s.name} (${s.studentId}): semester = ${s.semester || 'NOT SET'}`);
    });
    
    const withSemester = await User.countDocuments({ role: 'student', semester: { $exists: true, $ne: null } });
    const total = await User.countDocuments({ role: 'student' });
    console.log(`\nStudents with semester: ${withSemester}/${total}`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
