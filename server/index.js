import cors from "cors";
import express from "express";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categories, resources } from "./data/resources.js";
import { getStats, seedReviews } from "./data/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const reviewsPath = path.join(dataDir, "reviews.json");
const resourcesPath = path.join(dataDir, "resources.json");
const categoriesPath = path.join(dataDir, "categories.json");

// Simple Admin Auth
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const app = express();
const port = process.env.API_PORT;

app.use(cors({ origin: process.env.WEB_ORIGIN }));
app.use(express.json({ limit: "32kb" }));

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    await mkdir(dataDir, { recursive: true });
    await writeFile(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "designstocker-api",
    version: "1.2.0",
    message: "API is active."
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "designstocker-api" });
});

app.get("/api/resources", async (req, res) => {
  const { category, q } = req.query;
  const query = cleanText(q, 80).toLowerCase();

  const allResources = await readJson(resourcesPath, resources);
  const allCategories = await readJson(categoriesPath, categories);

  const filtered = allResources.filter((resource) => {
    const matchesCategory = !category || category === "all" || resource.category === category;
    const haystack = `${resource.name} ${resource.domain} ${resource.description} ${resource.category}`.toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    return matchesCategory && matchesQuery;
  });

  res.json({ categories: allCategories, resources: filtered, stats: getStats() });
});

app.post("/api/categories", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized. Admin access only." });
  }

  const { name, use } = req.body;
  if (!name || !use) {
    return res.status(400).json({ message: "Category name and usage description are required." });
  }

  const allCategories = await readJson(categoriesPath, categories);
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (allCategories.some(c => c.slug === slug)) {
    return res.status(400).json({ message: "Category already exists." });
  }

  const newCategory = { slug, name, use: cleanText(use, 100) };
  allCategories.push(newCategory);
  allCategories.sort((a, b) => a.name.localeCompare(b.name));

  await writeJson(categoriesPath, allCategories);
  res.status(201).json({ category: newCategory });
});

app.post("/api/resources", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized. Admin access only." });
  }

  const { name, href, category, rating, featured, description } = req.body;

  if (!name || !href || !category || !description) {
    return res.status(400).json({ message: "Name, link, category, and description are required." });
  }

  const allResources = await readJson(resourcesPath, resources);

  // Generate slug and domain
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  let domain = "";
  try {
    domain = new URL(href).hostname.replace("www.", "");
  } catch {
    domain = href;
  }

  const newResource = {
    category,
    href,
    slug,
    name,
    domain,
    rating: Number(rating) || 0,
    featured: !!featured,
    description: cleanText(description, 300)
  };

  allResources.push(newResource);
  // Optional: keep it sorted
  allResources.sort((a, b) => a.name.localeCompare(b.name));

  await writeJson(resourcesPath, allResources);

  res.status(201).json({ resource: newResource });
});

app.get("/api/reviews", async (req, res) => {
  const reviews = await readJson(reviewsPath, seedReviews);
  res.json({ reviews: reviews.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.post("/api/reviews", async (req, res) => {
  const resourceSlug = cleanText(req.body.resourceSlug, 60);
  const name = cleanText(req.body.name, 48);
  const role = cleanText(req.body.role, 64);
  const comment = cleanText(req.body.comment, 240);
  const rating = Number(req.body.rating);

  if (!resources.some((resource) => resource.slug === resourceSlug)) {
    return res.status(400).json({ message: "Choose a listed resource." });
  }

  if (!name || !comment || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Name, rating, and review are required." });
  }

  const reviews = await readJson(reviewsPath, seedReviews);
  const review = {
    id: `rvw-${Date.now()}`,
    resourceSlug,
    name,
    role: role || "Designer",
    rating,
    comment,
    createdAt: new Date().toISOString()
  };
  reviews.push(review);
  await writeJson(reviewsPath, reviews);

  res.status(201).json({ review });
});

// 404 Fallback - Always return JSON, not HTML
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", message: `Route ${req.originalUrl} does not exist.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

// Only start the server if we are running locally
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`DesignStocker API running on http://localhost:${port}`);
  });
}

// Export for Vercel
export default app;
