import express from "express";
import db from "../config/db.js"; // Apne existing DB import path ke mutabiq adjust karein

const router = express.Router();

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// GET /share/projects/:id
router.get("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT id, title, description FROM projects WHERE id = ? LIMIT 1",
      [id]
    );
    const project = rows?.[0];

    const frontendBase = (
      process.env.FRONTEND_URL || "https://your-app.vercel.app"
    ).replace(/\/+$/, "");

    if (!project) {
      return res.redirect(`${frontendBase}/`);
    }

    const projectUrl = `${frontendBase}/projects/${project.id}`;
    const safeTitle = escapeHtml(project.title || "Project Nexus");
    const safeDesc = escapeHtml(
      (project.description || "Explore this project on Project Nexus").slice(0, 200)
    );

    res.status(200).set("Content-Type", "text/html; charset=utf-8").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />

    <!-- Open Graph (WhatsApp, Slack, LinkedIn, Facebook) -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${projectUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />

    <!-- Twitter / Slack Fallback -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDesc}" />

    <!-- Normal Browser Redirect to Vercel Frontend -->
    <meta http-equiv="refresh" content="0; url=${projectUrl}" />
    <script>window.location.replace(${JSON.stringify(projectUrl)});</script>
  </head>
  <body>
    <p>Redirecting to <a href="${projectUrl}">${safeTitle}</a>...</p>
  </body>
</html>`);
  } catch (error) {
    console.error("Share preview error:", error);
    res.status(500).send("Unable to load project preview");
  }
});

export default router;