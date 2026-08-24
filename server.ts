import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './src/server/routes/auth';
import { attendanceRouter } from './src/server/routes/attendance';
import { adminRouter } from './src/server/routes/admin';
import { exportRouter } from './src/server/routes/export';
import { approvalRouter } from './src/server/routes/approval';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON payload parser with generous limit for odometer photos
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Driver Attendance System Backend', timestamp: new Date().toISOString() });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/admin/export', exportRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/approval', approvalRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Driver Attendance server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
