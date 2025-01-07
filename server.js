const express = require("express");
const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");
const matter = require("gray-matter");
const Nanomark = require("nanomark");
const parser = new Nanomark();
const WebSocket = require("ws");

const app = express();
const wss = new WebSocket.Server({ port: 3001 });

// Store connected clients
let clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

// Notify clients to reload
const notifyReload = () => {
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send("reload");
    }
  });
};

// Process markdown files
function processMarkdown(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const { data, content: markdown } = matter(content);
  return {
    meta: data,
    content: parser.parse(markdown),
    path: path.basename(filePath, ".md"),
  };
}

// Generate navigation structure
function generateNavigation() {
  const pagesDir = "./pages";
  const pages = [];

  function processDirectory(dir, base = "") {
    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        const category = {
          title: item,
          items: [],
        };
        processDirectory(fullPath, path.join(base, item));
        pages.push(category);
      } else if (item.endsWith(".md")) {
        const { meta } = processMarkdown(fullPath);
        pages.push({
          title: meta.title || path.basename(item, ".md"),
          path: path.join(base, path.basename(item, ".md")),
          order: meta.order || 999,
        });
      }
    });
  }

  processDirectory(pagesDir);
  return pages.sort((a, b) => (a.order || 999) - (b.order || 999));
}

// Generate search index
function generateSearchIndex() {
  const pagesDir = "./pages";
  const pages = [];

  function processDirectory(dir, base = "") {
    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDirectory(fullPath, path.join(base, item));
      } else if (item.endsWith(".md")) {
        const { meta, content } = processMarkdown(fullPath);
        pages.push({
          title: meta.title || path.basename(item, ".md"),
          path: path.join(base, path.basename(item, ".md")),
          content,
        });
      }
    });
  }

  processDirectory(pagesDir);
  return pages;
}

// Template function
function template(content, title, navigation) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Documentation</title>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="layout">
        <header>
            <div class="header-content">
                <div class="logo">
                    <img src="silk-logo.png" alt="Logo">
                    <span>Silk Documentation</span>
                </div>
                <div class="header-actions">
                    <input type="text" id="search" placeholder="Search docs..." />
                    <button id="theme-toggle">🌙</button>
                </div>
            </div>
        </header>
        
        <nav>
            <div class="nav-content">
                ${generateNavigationHTML(navigation)}
            </div>
        </nav>

        <main>
            <div class="content">
                ${content}
            </div>
        </main>
    </div>
    
    <script src="/script.js"></script>
    ${
      process.env.NODE_ENV === "development"
        ? `
    <script>
        const ws = new WebSocket('ws://localhost:3001');
        ws.onmessage = () => window.location.reload();
    </script>
    `
        : ""
    }
</body>
</html>`;
}

function generateNavigationHTML(navigation) {
  return `
        <ul class="nav-list">
            ${navigation
              .map((item) => {
                if (item.items) {
                  return `
                        <li class="nav-category">
                            <span>${item.title}</span>
                            ${generateNavigationHTML(item.items)}
                        </li>
                    `;
                }
                return `
                    <li class="nav-item">
                        <a href="/${item.path}">${item.title}</a>
                    </li>
                `;
              })
              .join("")}
        </ul>
    `;
}

// Set up middleware
app.use(express.static("public"));

// Search index endpoint
app.get("/search-index.json", (req, res) => {
  const searchIndex = generateSearchIndex();
  res.json(searchIndex);
});

// Main route handler
app.get("/*", (req, res) => {
  const pagePath = req.path === "/" ? "/index" : req.path;
  const fullPath = path.join("./pages", `${pagePath}.md`);

  try {
    if (fs.existsSync(fullPath)) {
      const { meta, content } = processMarkdown(fullPath);
      const navigation = generateNavigation();
      res.send(template(content, meta.title || "Documentation", navigation));
    } else {
      res
        .status(404)
        .send(
          template("<h1>404 - Page Not Found</h1>", "404", generateNavigation())
        );
    }
  } catch (error) {
    res
      .status(500)
      .send(
        template("<h1>500 - Server Error</h1>", "500", generateNavigation())
      );
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Watch for file changes in development
if (process.env.NODE_ENV === "development") {
  chokidar
    .watch(["./pages", "./public"], {
      ignored: /(^|[\/\\])\../,
      persistent: true,
    })
    .on("all", (event, path) => {
      console.log(`File ${path} has been ${event}ed`);
      notifyReload();
    });
}
