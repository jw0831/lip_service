import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startSchedulers } from "./scheduler";

// 환경변수 확인
console.log('🔧 환경변수 상태:');
console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT_SET');
console.log('GMAIL_PASS:', process.env.GMAIL_PASS ? 'SET' : 'NOT_SET');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3000 or next available port  
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || "3000");
  
  const startServer = (currentPort: number) => {
    server.listen({
      port: currentPort,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${currentPort}`);
      // 서버 시작 후 스케줄러 실행
      startSchedulers();
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${currentPort} is in use, trying ${currentPort + 1}`);
        startServer(currentPort + 1);
      } else {
        throw err;
      }
    });
  };
  
  startServer(port);
})();
