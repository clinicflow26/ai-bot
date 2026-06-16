import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generateChatResponse } from "./server/ai";

/**
 * Configure dotenv to load environment variables from .env
 */
import dotenv from "dotenv";
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup JSON parsing for request bodies
  app.use(express.json());

  // API Endpoints go here first
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { messages, webSearch } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      const aiResponse = await generateChatResponse(messages, !!webSearch);
      return res.json(aiResponse);
    } catch (err: any) {
      console.error("[Server API Error]:", err);
      return res.status(500).json({
        error: err?.message || "An error occurred inside the chat API handler.",
      });
    }
  });

  // Client-side Vite configuration and routing
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Launching in Development mode with Vite middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Launching in Production mode with static folders.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Chat bot container running on host 0.0.0.0, port ${PORT}`);
  });
}

startServer();
