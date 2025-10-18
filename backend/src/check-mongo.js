import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load .env from this src folder
dotenv.config({ path: './.env' });

const uri = process.env.MONGODB_URI;
console.log('MONGODB_URI (masked):', uri ? uri.replace(/(mongodb\+srv:\/\/)(.*?):(.*?)@/, '$1$2:*****@') : '(not set)');

(async () => {
  try {
    await mongoose.connect(uri, { autoIndex: false });
    console.log('Connected to MongoDB successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Connection error:');
    console.error(err);
    process.exit(1);
  }
})();
