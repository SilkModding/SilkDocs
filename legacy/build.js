const fs = require("fs");
const path = require("path");
const Nanomark = require("nanomark");
const parser = new Nanomark();

// Create dist directory if it doesn't exist
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist");
}

// Copy static files
fs.copyFileSync("src/styles.css", "dist/styles.css");
fs.copyFileSync("src/script.js", "dist/script.js");

// Read and process all markdown files
const pagesDir = "./pages";
const pages = fs
  .readdirSync(pagesDir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => {
    const content = fs.readFileSync(path.join(pagesDir, file), "utf-8");
    const html = parser.parse(content);
    const name = file.replace(".md", "");
    return { name, html };
  });

// Generate sidebar links
const sidebarLinks = pages
  .map((page) => `<a href="${page.name}.html">${page.name}</a>`)
  .join("\n");

// HTML template
const template = (content, title) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Documentation</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <nav>
        <div class="search-container">
            <input type="text" id="search" placeholder="Search docs...">
        </div>
        <div class="sidebar-links">
            ${sidebarLinks}
        </div>
    </nav>
    <main>
        <h1>${title}</h1>
        ${content}
    </main>
    <script src="script.js"></script>
</body>
</html>
`;

// Generate HTML files
pages.forEach((page) => {
  const html = template(page.html, page.name);
  fs.writeFileSync(`dist/${page.name}.html`, html);
});

// Create index.html that redirects to the first page
const indexContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="refresh" content="0;url=${pages[0].name}.html">
</head>
<body>
    Redirecting...
</body>
</html>
`;

fs.writeFileSync("dist/index.html", indexContent);

console.log("Documentation site built successfully!");
