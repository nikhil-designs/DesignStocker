"use client";

import { useEffect, useState } from "react";
import { Sparkles, Save, ShieldCheck, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [apiCategories, setApiCategories] = useState([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", use: "" });

  const [form, setForm] = useState({
    name: "",
    href: "",
    category: "",
    rating: 5,
    featured: false,
    description: ""
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function fetchCats() {
      try {
        const res = await fetch("http://localhost:4000/api/resources");

        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          throw new Error("Admin API returned non-JSON response");
        }

        const data = await res.json();
        setApiCategories(data.categories);
        if (data.categories.length > 0) {
          setForm(prev => ({ ...prev, category: data.categories[0].slug }));
        }
      } catch (err) {
        console.warn("[Admin] Failed to fetch live categories:", err.message);
      }
    }
    fetchCats();
  }, []);

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === "NEW_CATEGORY") {
      setIsAddingCategory(true);
    } else {
      setIsAddingCategory(false);
      setForm({ ...form, category: val });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.use) {
      setStatus("Error: Category name and use are required.");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        const data = await res.json();
        setApiCategories(prev => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)));
        setForm({ ...form, category: data.category.slug });
        setIsAddingCategory(false);
        setNewCategory({ name: "", use: "" });
        setStatus("Category created!");
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.message}`);
      }
    } catch (err) {
      setStatus("Failed to create category.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isAddingCategory) {
      setStatus("Error: Please finish adding the new category first.");
      return;
    }
    setStatus("Saving...");

    try {
      const res = await fetch("http://localhost:4000/api/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setStatus("Success! Resource added.");
        setForm({ ...form, name: "", href: "", rating: 5, featured: false, description: "" });
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.message}`);
      }
    } catch (err) {
      setStatus("Failed to connect to API.");
    }
  };

  return (
    <main className="adminContainer">
      <div className="adminBox">
        <div className="adminHeader">
          <Link href="/" className="backLink"><ArrowLeft size={16} /> Home</Link>
          <div className="adminBrand">
            <span className="brandMark">
              <img src="/DS.jpg" alt="" width={32} height={32} style={{ borderRadius: "9px" }} />
            </span>
            <h1>Resource Admin</h1>
          </div>
          <p>Add new design websites to the library</p>
        </div>

        <form onSubmit={handleSubmit} className="adminForm">
          <div className="inputGroup">
            <label>Admin Password</label>
            <input
              type="password"
              placeholder="Enter secret key..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="formGrid">
            <div className="inputGroup">
              <label>Website Name</label>
              <input
                type="text"
                placeholder="e.g. Dribbble"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required={!isAddingCategory}
              />
            </div>
            <div className="inputGroup">
              <label>Website Link</label>
              <input
                type="url"
                placeholder="https://..."
                value={form.href}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
                required={!isAddingCategory}
              />
            </div>
          </div>

          <div className="formGrid">
            <div className="inputGroup">
              <label>Category</label>
              <select
                value={isAddingCategory ? "NEW_CATEGORY" : form.category}
                onChange={handleCategoryChange}
              >
                {apiCategories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                <option value="NEW_CATEGORY">+ Add a new category</option>
              </select>
            </div>
            <div className="inputGroup">
              <label>Rating (1-5)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </div>
          </div>

          {isAddingCategory && (
            <div className="newCategorySection">
              <h3>Create New Category</h3>
              <div className="inputGroup">
                <label>Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. 3D Assets"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
              </div>
              <div className="inputGroup">
                <label>Usage (Short description)</label>
                <input
                  type="text"
                  placeholder="e.g. High-quality 3D models and textures"
                  value={newCategory.use}
                  onChange={(e) => setNewCategory({ ...newCategory, use: e.target.value })}
                />
              </div>
              <button type="button" onClick={handleCreateCategory} className="createCatBtn">
                <Plus size={16} /> Confirm New Category
              </button>
            </div>
          )}

          <div className="inputGroup checkbox">
            <input
              type="checkbox"
              id="topPick"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            <label htmlFor="topPick">Mark as "Top Pick"</label>
          </div>

          <div className="inputGroup">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="What is this website used for? (max 300 chars)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            ></textarea>
          </div>

          <button type="submit" className="adminBtn">
            <Save size={18} /> Save Resource
          </button>

          {status && <div className={`statusNotice ${status.includes("Success") ? "success" : "error"}`}>{status}</div>}
        </form>
      </div>

      <style jsx>{`
        .adminContainer {
          min-height: 100vh;
          background: var(--bg);
          display: grid;
          place-items: center;
          padding: 20px;
          color: var(--ink);
        }
        .adminBox {
          width: 100%;
          max-width: 500px;
          background: white;
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .adminHeader {
          text-align: center;
          margin-bottom: 30px;
        }
        .adminBrand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .adminHeader h1 { font-size: 1.5rem; margin: 0; }
        .adminHeader p { color: var(--muted); font-size: 0.9rem; }
        .backLink {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--muted);
          text-decoration: none;
          font-size: 0.85rem;
          margin-bottom: 16px;
        }
        .adminForm { display: flex; flex-direction: column; gap: 20px; }
        .formGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .inputGroup { display: flex; flex-direction: column; gap: 8px; }
        .inputGroup label { font-weight: 600; font-size: 0.9rem; }
        .inputGroup input, .inputGroup select, .inputGroup textarea {
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--surface-soft);
          font-family: inherit;
        }
        .checkbox { flex-direction: row; align-items: center; cursor: pointer; }
        .checkbox input { width: auto; margin: 0; }
        .adminBtn {
          margin-top: 10px;
          background: var(--accent);
          color: white;
          padding: 14px;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.2s;
        }
        .adminBtn:active { transform: scale(0.98); }
        .statusNotice {
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-size: 0.9rem;
          font-weight: 600;
        }
        .statusNotice.success { background: #f0fec7; color: #142413; }
        .statusNotice.error { background: #fee2e2; color: #991b1b; }
        
        .newCategorySection {
          padding: 20px;
          background: var(--surface-soft);
          border: 2px dashed var(--line);
          border-radius: 12px;
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .newCategorySection h3 { margin: 0; font-size: 1rem; color: var(--accent); }
        .createCatBtn {
          background: #f0fec7;
          color: #142413;
          padding: 12px;
          border: 1px solid #142413;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
      `}</style>
    </main>
  );
}
