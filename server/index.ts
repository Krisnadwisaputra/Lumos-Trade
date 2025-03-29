import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { initializeWebSocket } from "./websocket";
import { initializeExchange } from "./exchange";

// Remove the custom console.log override that was causing infinite recursion

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
  try {
    console.log("Starting server...");
    
    // Create HTTP server
    const httpServer = createServer(app);
    console.log("HTTP server created");
    
    try {
      // Initialize WebSocket server
      initializeWebSocket(httpServer);
      console.log("WebSocket server initialized");
    } catch (e) {
      console.error("Error initializing WebSocket server:", e);
    }
    
    try {
      // Initialize exchange connection
      initializeExchange();
      console.log("Exchange connection initialized");
    } catch (e) {
      console.error("Error initializing exchange connection:", e);
    }
    
    try {
      // Register API routes
      await registerRoutes(app, httpServer);
      console.log("API routes registered");
    } catch (e) {
      console.error("Error registering API routes:", e);
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    try {
      if (app.get("env") === "development") {
        await setupVite(app, httpServer);
        console.log("Vite setup complete");
      } else {
        serveStatic(app);
        console.log("Static files setup complete");
      }
    } catch (e) {
      console.error("Error setting up frontend:", e);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    console.log(`Attempting to start server on port ${port}...`);
    
    httpServer.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`Server is now running on port ${port}`);
      log(`serving on port ${port}`);
    });
    
    // Add error handler for server
    httpServer.on('error', (err) => {
      console.error(`Server failed to start: ${err.message}`);
    });
    
  } catch (e) {
    console.error("Fatal server error:", e);
  }
})();
