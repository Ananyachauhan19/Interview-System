import './setup.js';
import app from './setupApp.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDb } from './utils/db.js';
import './jobs/reminders.js';
import { seedAdminIfNeeded } from './controllers/authController.js';

const PORT = process.env.PORT || 4000;

await connectDb();
await seedAdminIfNeeded();

const httpServer = createServer(app);

// Setup Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io instance for use in controllers
export { io };

httpServer.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
  console.log(`Socket.IO server ready`);
});
