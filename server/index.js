import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { categories, resources } from "./data/resources.js";
import { getStats, seedReviews } from "./data/seed.js";

// Simple Admin Auth
const ADMIN_SECRET = process.env.ADMIN_SECRET;

const app = express();
const port = process.env.API_PORT || 4000;

app.use(cors({ origin: process.env.WEB_ORIGIN }));
app.use(express.json({ limit: "32kb" }));

// --- MongoDB Setup ---
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not defined. The app will fail to connect.");
}

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (mongoose.connection.readyState === 1) {
    cachedDb = mongoose.connection;
    return cachedDb;
  }
  const conn = await mongoose.connect(MONGODB_URI);
  cachedDb = conn.connection;
  
  // Seed initial data if the database is completely empty
  await seedDatabaseIfNeeded();
  
  return cachedDb;
}

// --- Mongoose Models ---
const categorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  use: { type: String, required: true },
  order: { type: Number, default: 0 }
});

const resourceSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  href: { type: String, required: true },
  category: { type: String, required: true },
  domain: { type: String, required: true },
  rating: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  description: { type: String, required: true },
  order: { type: Number, default: 0 }
});

const reviewSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  resourceSlug: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema);
const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

// --- Seed Database if Empty ---
async function seedDatabaseIfNeeded() {
  try {
    const resourceCount = await Resource.countDocuments();
    if (resourceCount === 0) {
      console.log("Database is empty! Seeding existing local data...");
      await Category.insertMany(categories);
      await Resource.insertMany(resources);
      await Review.insertMany(seedReviews.map((r, i) => ({ ...r, id: `seed-rvw-${i}` })));
      console.log("Seeding complete!");
    }
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}

function cleanText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

// --- Routes ---
app.get("/", async (req, res) => {
  res.json({
    ok: true,
    service: "designstocker-api",
    version: "2.0.0 (MongoDB)",
    message: "API is active."
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await connectToDatabase();
    res.json({ ok: true, service: "designstocker-api", database: "connected" });
  } catch (err) {
    res.status(500).json({ ok: false, service: "designstocker-api", database: "disconnected" });
  }
});

app.get("/api/resources", async (req, res) => {
  try {
    await connectToDatabase();
    const { category, q } = req.query;
    const query = cleanText(q, 80).toLowerCase();

    // Fetch everything from DB, sorted by order then A-Z case-insensitively
    const allCategories = await Category.find().collation({ locale: "en", strength: 2 }).sort({ order: 1, name: 1 }).lean();
    let allResources = await Resource.find().collation({ locale: "en", strength: 2 }).sort({ order: 1, name: 1 }).lean();

    const filtered = allResources.filter((resource) => {
      const matchesCategory = !category || category === "all" || resource.category === category;
      const haystack = `${resource.name} ${resource.domain} ${resource.description} ${resource.category}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      return matchesCategory && matchesQuery;
    });

    // Send original stats or calculate dynamically
    res.json({ categories: allCategories, resources: filtered, stats: getStats() });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch resources" });
  }
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

  try {
    await connectToDatabase();
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "Category already exists." });
    }

    const newCategory = new Category({ slug, name, use: cleanText(use, 100) });
    await newCategory.save();
    
    res.status(201).json({ category: newCategory });
  } catch (err) {
    res.status(500).json({ message: "Database error." });
  }
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

  try {
    await connectToDatabase();
    
    // Generate slug and domain
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    let domain = "";
    try {
      domain = new URL(href).hostname.replace("www.", "");
    } catch {
      domain = href;
    }

    const newResource = new Resource({
      category,
      href,
      slug,
      name,
      domain,
      rating: Number(rating) || 0,
      featured: !!featured,
      description: cleanText(description, 300)
    });

    await newResource.save();
    res.status(201).json({ resource: newResource });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "A resource with that name already exists." });
    }
    res.status(500).json({ message: "Database error." });
  }
});

app.delete("/api/categories/:slug", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized. Admin access only." });
  }

  try {
    await connectToDatabase();
    await Category.deleteOne({ slug: req.params.slug });
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Database error." });
  }
});

app.delete("/api/resources/:slug", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized. Admin access only." });
  }

  try {
    await connectToDatabase();
    await Resource.deleteOne({ slug: req.params.slug });
    res.json({ message: "Resource deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Database error." });
  }
});

app.put("/api/categories/reorder", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ message: "Unauthorized." });
  try {
    await connectToDatabase();
    const { updates } = req.body;
    for (const update of updates) {
      await Category.updateOne({ slug: update.slug }, { $set: { order: update.order } });
    }
    res.json({ message: "Reordered" });
  } catch (err) {
    res.status(500).json({ message: "DB Error" });
  }
});

app.put("/api/resources/reorder", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) return res.status(401).json({ message: "Unauthorized." });
  try {
    await connectToDatabase();
    const { updates } = req.body;
    for (const update of updates) {
      await Resource.updateOne({ slug: update.slug }, { $set: { order: update.order } });
    }
    res.json({ message: "Reordered" });
  } catch (err) {
    res.status(500).json({ message: "DB Error" });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    await connectToDatabase();
    const reviews = await Review.find().sort({ createdAt: -1 }).lean();
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

app.post("/api/reviews", async (req, res) => {
  try {
    await connectToDatabase();
    
    const resourceSlug = cleanText(req.body.resourceSlug, 60);
    const name = cleanText(req.body.name, 48);
    const role = cleanText(req.body.role, 64);
    const comment = cleanText(req.body.comment, 240);
    const rating = Number(req.body.rating);

    const resourceExists = await Resource.exists({ slug: resourceSlug });
    if (!resourceExists) {
      return res.status(400).json({ message: "Choose a listed resource." });
    }

    if (!name || !comment || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Name, rating, and review are required." });
    }

    const review = new Review({
      id: `rvw-${Date.now()}`,
      resourceSlug,
      name,
      role: role || "Designer",
      rating,
      comment
    });

    await review.save();
    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ message: "Database error." });
  }
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
  app.listen(port, async () => {
    console.log(`DesignStocker API running on http://localhost:${port}`);
    try {
      await connectToDatabase();
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("Failed to connect to MongoDB on startup", err);
    }
  });
}

// Export for Vercel
export default app;
