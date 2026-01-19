import { createApp } from "./app";
import { createServer } from "http";

export { createApp };

// Only start server if not in serverless environment
if (!process.env.VERCEL) {
  (async () => {
    const app = await createApp();
    const httpServer = createServer(app);
    
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        console.log(`serving on port ${port}`);
      },
    );
  })();
}
