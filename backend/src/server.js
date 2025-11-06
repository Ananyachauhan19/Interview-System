import './setup.js';
import app from './setupApp.js';
import { connectDb } from './utils/db.js';
import './jobs/reminders.js';
import { seedAdminIfNeeded } from './controllers/authController.js';

const PORT = process.env.PORT || 4000;

await connectDb();
await seedAdminIfNeeded();
app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
