import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

function repoStoragePlugin(): Plugin {
  return {
    name: "repo-storage-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];

        // 1. Save Project State to Git Repository (public/data/default_project_state.json)
        if (req.method === "POST" && url === "/api/save-repo-project") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const dataDir = path.resolve(process.cwd(), "public", "data");
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              const filePath = path.join(dataDir, "default_project_state.json");
              fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  path: "public/data/default_project_state.json",
                  timestamp: new Date().toISOString(),
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: err?.message || String(err) }));
            }
          });
          return;
        }

        // 2. Save Custom 3D Model file to Git Repository (public/models/custom/...)
        if (req.method === "POST" && url === "/api/save-custom-model") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body);
              const {
                componentId,
                fileName,
                format,
                scaleMultiplier,
                fileBase64,
                componentName,
                category,
              } = payload;

              if (!fileName || !fileBase64) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: false, error: "fileName and fileBase64 are required" })
                );
                return;
              }

              const customModelsDir = path.resolve(process.cwd(), "public", "models", "custom");
              if (!fs.existsSync(customModelsDir)) {
                fs.mkdirSync(customModelsDir, { recursive: true });
              }

              // Sanitize fileName to prevent directory traversal
              const ext = path.extname(fileName) || `.${format || "glb"}`;
              const baseNameWithoutExt = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
              const sanitizedFileName = `${baseNameWithoutExt}${ext.toLowerCase()}`;
              const targetFilePath = path.join(customModelsDir, sanitizedFileName);

              // Convert base64 to binary buffer and write to disk
              const base64Data = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
              const fileBuffer = Buffer.from(base64Data, "base64");
              fs.writeFileSync(targetFilePath, fileBuffer);

              // Update custom models manifest in public/data/
              const dataDir = path.resolve(process.cwd(), "public", "data");
              if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
              }
              const manifestPath = path.join(dataDir, "custom_models_manifest.json");
              let customManifest: any[] = [];
              if (fs.existsSync(manifestPath)) {
                try {
                  customManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                  if (!Array.isArray(customManifest)) customManifest = [];
                } catch {
                  customManifest = [];
                }
              }

              const relativeUrl = `/models/custom/${sanitizedFileName}`;
              const modelRecord = {
                componentId,
                componentName: componentName || sanitizedFileName,
                assetKey: `custom_${componentId}`,
                sourceType: "file",
                format: format || "glb",
                scaleMultiplier: scaleMultiplier || 1.0,
                fileName: sanitizedFileName,
                fileUrl: relativeUrl,
                category: category || "Boshqa",
                fileSize: fileBuffer.length,
                updatedAt: Date.now(),
              };

              // Replace or append
              const existingIdx = customManifest.findIndex(
                (m) => m.componentId === componentId || m.fileName === sanitizedFileName
              );
              if (existingIdx >= 0) {
                customManifest[existingIdx] = modelRecord;
              } else {
                customManifest.push(modelRecord);
              }
              fs.writeFileSync(manifestPath, JSON.stringify(customManifest, null, 2), "utf-8");

              res.setHeader("Content-Type", "application/json");
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, fileUrl: relativeUrl, modelRecord }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: err?.message || String(err) }));
            }
          });
          return;
        }

        // 3. Get Project State from Repository
        if (req.method === "GET" && url === "/api/project-state") {
          const filePath = path.resolve(process.cwd(), "public", "data", "default_project_state.json");
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(content);
          } else {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, message: "No saved project state found" }));
          }
          return;
        }

        // 4. Get Custom Models Manifest from Repository
        if (req.method === "GET" && url === "/api/custom-models") {
          const filePath = path.resolve(process.cwd(), "public", "data", "custom_models_manifest.json");
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(content);
          } else {
            res.setHeader("Content-Type", "application/json");
            res.statusCode = 200;
            res.end(JSON.stringify([]));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), repoStoragePlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
});
