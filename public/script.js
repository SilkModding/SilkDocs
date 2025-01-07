document.addEventListener("DOMContentLoaded", () => {
  // Theme toggling
  const themeToggle = document.getElementById("theme-toggle");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function setTheme(isDark) {
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "dark" : "light"
    );
    themeToggle.textContent = isDark ? "🌙" : "☀️";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  // Initialize theme
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) {
    setTheme(storedTheme === "dark");
  } else {
    setTheme(prefersDark.matches);
  }

  themeToggle.addEventListener("click", () => {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(!isDark);
  });

  // Search functionality
  const searchInput = document.getElementById("search");
  let searchIndex = null;
  let searchResults = document.createElement("div");
  searchResults.className = "search-results";
  searchInput.parentNode.appendChild(searchResults);

  async function initializeSearch() {
    try {
      const response = await fetch("/search-index.json");
      searchIndex = await response.json();
    } catch (error) {
      console.error("Failed to load search index:", error);
    }
  }

  function performSearch(query) {
    if (!searchIndex || !query.trim()) {
      searchResults.style.display = "none";
      return;
    }

    query = query.toLowerCase();
    const results = searchIndex
      .filter((page) => {
        const titleMatch = page.title.toLowerCase().includes(query);
        const contentMatch = page.content.toLowerCase().includes(query);
        return titleMatch || contentMatch;
      })
      .slice(0, 5); // Limit to top 5 results

    displaySearchResults(results);
  }

  function displaySearchResults(results) {
    if (results.length === 0) {
      searchResults.style.display = "none";
      return;
    }

    searchResults.innerHTML = `
          <div class="search-results-inner">
              ${results
                .map(
                  (result) => `
                  <a href="${result.path}" class="search-result">
                      <div class="search-result-title">${result.title}</div>
                      <div class="search-result-preview">${result.preview}</div>
                  </a>
              `
                )
                .join("")}
          </div>
      `;
    searchResults.style.display = "block";
  }

  // Handle search input with debouncing
  let debounceTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      performSearch(e.target.value);
    }, 300);
  });

  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });

  // Initialize search
  initializeSearch();

  // Handle active navigation state
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-item a");
  navLinks.forEach((link) => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });

  // Handle mobile navigation
  // const mobileNavToggle = document.createElement("button");
  // mobileNavToggle.className = "mobile-nav-toggle";
  // mobileNavToggle.innerHTML = "☰";
  // document.querySelector(".header-content").prepend(mobileNavToggle);

  // mobileNavToggle.addEventListener("click", () => {
  //   document.querySelector("nav").classList.toggle("nav-open");
  // });
});
