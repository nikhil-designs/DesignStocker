"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Heart,
  Search,
  Send,
  Sparkles,
  Star,
  WalletCards
} from "lucide-react";
import { categories, resources } from "@/data/resources";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const quickAmounts = {
  INR: [49, 99, 199, 499],
  USD: [1, 5, 10, 25]
};

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} size={14} fill={index < Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [apiCategories, setApiCategories] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [apiResources, setApiResources] = useState([]);
  const [notice, setNotice] = useState("");

  // Fetch dynamic resources with enhanced error catching
  useEffect(() => {
    async function fetchData() {
      const targetUrl = `${API_URL}/api/resources`;
      console.log(`[DesignStocker] Fetching resources from: ${targetUrl}`);

      try {
        const res = await fetch(targetUrl);

        // Check if response is actually JSON
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.warn(`[DesignStocker] API returned non-JSON or error (${res.status}). First 50 chars: ${text.substring(0, 50)}`);
          throw new Error("Invalid API response format");
        }

        const data = await res.json();
        setApiResources(data.resources || resources);
        setApiCategories(data.categories || categories);
        setStats(data.stats || []);
        console.log("[DesignStocker] Successfully loaded live resources.");
      } catch (err) {
        console.warn("[DesignStocker] Using local fallback data due to:", err.message);
        setApiResources(resources);
        setApiCategories(categories);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);
  const [reviews, setReviews] = useState([
    {
      id: "local-1",
      resourceSlug: "mobbin",
      name: "Aarav",
      role: "UI/UX student",
      rating: 5,
      comment: "Mobbin helped me understand real app flows much faster than scattered screenshots."
    },
    {
      id: "local-2",
      resourceSlug: "mockupworld",
      name: "Nisha",
      role: "Graphic designer",
      rating: 5,
      comment: "The mockups are clean and client-presentable. It saves a lot of searching time."
    }
  ]);
  const [reviewForm, setReviewForm] = useState({
    resourceSlug: "mobbin",
    name: "",
    role: "",
    rating: 5,
    comment: ""
  });

  const categoryMap = useMemo(() => new Map(apiCategories.map((category) => [category.slug, category])), [apiCategories]);
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return apiResources
      .filter((resource) => {
        const matchesCategory = activeCategory === "all" || resource.category === activeCategory;
        const matchesQuery =
          !normalizedQuery ||
          `${resource.name} ${resource.domain} ${resource.description} ${categoryMap.get(resource.category)?.name}`
            .toLowerCase()
            .includes(normalizedQuery);
        return matchesCategory && matchesQuery;
      });
  }, [activeCategory, apiResources, categoryMap, query]);

  const displayStats = useMemo(() => {
    if (stats && stats.length > 0) return stats;
    return [
      { label: "Resources", value: "35+" },
      { label: "Categories", value: "10+" },
      { label: "Top picks", value: "15+" },
      { label: "Avg rating", value: "4.3" }
    ];
  }, [stats]);

  async function submitReview(event) {
    event.preventDefault();
    if (!reviewForm.name.trim() || !reviewForm.comment.trim()) {
      setNotice("Please add your name and review before submitting.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm)
      });
      if (!response.ok) throw new Error("API unavailable");
      const data = await response.json();
      setReviews((current) => [data.review, ...current]);
      setNotice("Review added. Thank you for helping other designers choose faster.");
    } catch {
      const localReview = { ...reviewForm, id: `local-${Date.now()}`, role: reviewForm.role || "Designer" };
      setReviews((current) => [localReview, ...current]);
      setNotice("Review added locally. Start the Express API to save it permanently.");
    }

    setReviewForm({ resourceSlug: "mobbin", name: "", role: "", rating: 5, comment: "" });
  }


  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DesignStocker home">
          <span className="brandMark">
            <img 
              src="/DS.jpg" 
              alt="DesignStocker logo" 
              width={28} 
              height={28} 
              style={{ borderRadius: "10px", objectFit: "contain" }} 
            />
          </span>
          DesignStocker
        </a>
        <nav className="navLinks" aria-label="Main navigation">
          <a href="#resources">Resources</a>
          <a href="#reviews">Reviews</a>
        </nav>
      </header>

      <section id="top" className="hero">
        <div className="heroGlow heroGlowOne" />
        <div className="heroGlow heroGlowTwo" />
        <div className="heroText">
          <p className="eyebrow"><Check size={14} /> Free, curated, no-login resources</p>
          <h1>
            Find the <br />
            right <span className="wordSwitcher">
              <span className="wordList">
                <span className="word">design</span>
                <span className="word">assets</span>
                <span className="word">design</span>
              </span>
            </span> <br />
            without opening <br />
            10+ tabs.
          </h1>
          <p>
            A clean directory for beginner and mid-level designers: background removers, stock images, mockups,
            references, fonts, icons, color tools, and more.
          </p>
        </div>

        <div className="heroPanel" aria-label="DesignStocker summary">
          {displayStats.map((item) => (
            <div className={`statCard ${item.label.toLowerCase().replace(" ", "-")}`} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="resources" className="section">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Resource library</p>
            <h2>Browse by usage</h2>
          </div>
          <label className="searchBox">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by tool, category, or use"
            />
          </label>
        </div>

        <div className="categoryRail" aria-label="Filter categories">
          <button className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>
            All <span>{resources.length}</span>
          </button>
          {categories.map((category) => (
            <button
              className={activeCategory === category.slug ? "active" : ""}
              key={category.slug}
              onClick={() => setActiveCategory(category.slug)}
            >
              {category.name} <span>{resources.filter((resource) => resource.category === category.slug).length}</span>
            </button>
          ))}
        </div>

        <div className="resourceGrid">
          {filteredResources.map((resource) => {
            const category = categoryMap.get(resource.category);
            return (
              <article className="resourceCard" key={resource.slug}>
                <div className="cardTop">
                  <span className="categoryLabel">{category?.name}</span>
                  {resource.featured && <span className="topPick">Top pick</span>}
                </div>
                <h3>{resource.name}</h3>
                <p>{resource.description}</p>
                <div className="metaRow">
                  <Stars value={resource.rating} />
                  <span>{resource.rating.toFixed(1)}</span>
                </div>
                <div className="cardBottom">
                  <span>{resource.domain}</span>
                  <a href={resource.href} target="_blank" rel="noreferrer">
                    Visit <ExternalLink size={15} />
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {filteredResources.length === 0 && (
          <div className="emptyState">
            <h3>No resource found</h3>
            <p>Try another keyword or choose a different category.</p>
          </div>
        )}
      </section>

      <section id="reviews" className="section twoColumn">
        <div>
          <p className="eyebrow">Community reviews</p>
          <h2>Help other designers pick faster</h2>
          <p className="muted">
            Reviews make the directory more useful than a spreadsheet because people can explain what a tool is
            actually good for.
          </p>
          <div className="reviewsList">
            {reviews.map((review) => (
              <article className="reviewCard" key={review.id}>
                <div className="reviewTop">
                  <strong>{review.name}</strong>
                  <Stars value={review.rating} />
                </div>
                <p>{review.comment}</p>
                <span>
                  {review.role} reviewing {resources.find((resource) => resource.slug === review.resourceSlug)?.name}
                </span>
              </article>
            ))}
          </div>
        </div>

        <form className="formPanel" onSubmit={submitReview}>
          <h3>Add a review</h3>
          <label>
            Resource
            <select
              value={reviewForm.resourceSlug}
              onChange={(event) => setReviewForm({ ...reviewForm, resourceSlug: event.target.value })}
            >
              {resources.map((resource) => (
                <option key={resource.slug} value={resource.slug}>{resource.name}</option>
              ))}
            </select>
          </label>
          <label>
            Your name
            <input
              value={reviewForm.name}
              onChange={(event) => setReviewForm({ ...reviewForm, name: event.target.value })}
              placeholder="e.g. Nikhil"
            />
          </label>
          <label>
            Role
            <input
              value={reviewForm.role}
              onChange={(event) => setReviewForm({ ...reviewForm, role: event.target.value })}
              placeholder="e.g. UI/UX student"
            />
          </label>
          <label>
            Rating
            <input
              max="5"
              min="1"
              type="number"
              value={reviewForm.rating}
              onChange={(event) => setReviewForm({ ...reviewForm, rating: Number(event.target.value) })}
            />
          </label>
          <label>
            Review
            <textarea
              value={reviewForm.comment}
              onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })}
              placeholder="What did this tool help you do?"
            />
          </label>
          <button className="primaryButton" type="submit"><Send size={16} /> Submit review</button>
        </form>
      </section>

      {notice && (
        <button className="notice" onClick={() => setNotice("")}>
          <Heart size={16} fill="currentColor" />
          {notice}
        </button>
      )}

      <footer>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/DS.jpg" alt="" width={25} height={25} style={{ borderRadius: "8px" }} />
          <strong>DesignStocker</strong>
        </div>
        <span>Made for designers who are still building their asset toolkit.</span>
        <a href="#top">Back to top <ArrowUpRight size={14} /></a>
      </footer>
    </main>
  );
}
