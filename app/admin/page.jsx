"use client";

import { useEffect, useState } from "react";
import { Sparkles, Save, ShieldCheck, ArrowLeft, Plus, Trash2, GripVertical } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [apiCategories, setApiCategories] = useState([]);
  const [apiResources, setApiResources] = useState([]);
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
  const [viewTab, setViewTab] = useState("add"); // "add" or "manage"

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch(`${API_URL}/api/resources`);

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error("Admin API returned non-JSON response");
      }

      const data = await res.json();
      setApiCategories(data.categories || []);
      setApiResources(data.resources || []);
      
      if (data.categories && data.categories.length > 0 && !form.category) {
        setForm(prev => ({ ...prev, category: data.categories[0].slug }));
      }
    } catch (err) {
      console.warn("[Admin] Failed to fetch live data:", err.message);
    }
  }

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
      const res = await fetch(`${API_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${password}`
        },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        setStatus("Category created!");
        setIsAddingCategory(false);
        setNewCategory({ name: "", use: "" });
        await fetchData(); // Refresh everything to get exact A-Z sorting
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
      const res = await fetch(`${API_URL}/api/resources`, {
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
        await fetchData(); // Refresh the list automatically
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.message}`);
      }
    } catch (err) {
      setStatus("Failed to connect to API.");
    }
  };

  const handleDeleteResource = async (slug) => {
    if (!confirm("Are you sure you want to delete this website?")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/resources/${slug}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${password}` }
      });
      if (res.ok) {
        setStatus("Website deleted successfully.");
        await fetchData();
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.message || "Could not delete"}`);
      }
    } catch (err) {
      setStatus("Failed to delete.");
    }
  };

  const handleDeleteCategory = async (slug) => {
    if (!confirm("Are you sure you want to delete this category? (Make sure no websites are using it!)")) return;
    
    try {
      const res = await fetch(`${API_URL}/api/categories/${slug}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${password}` }
      });
      if (res.ok) {
        setStatus("Category deleted successfully.");
        await fetchData();
      } else {
        const err = await res.json();
        setStatus(`Error: ${err.message || "Could not delete"}`);
      }
    } catch (err) {
      setStatus("Failed to delete.");
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleResDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!password) {
      setStatus("Error: Admin password required to reorder.");
      return;
    }
    const dragIndex = Number(e.dataTransfer.getData("resIndex"));
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const newItems = [...apiResources];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    setApiResources(newItems);

    const updates = newItems.map((r, idx) => ({ slug: r.slug, order: idx }));
    try {
      await fetch(`${API_URL}/api/resources/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${password}` },
        body: JSON.stringify({ updates })
      });
      setStatus("Website order saved.");
    } catch (err) {
      setStatus("Failed to save order.");
    }
  };

  const handleCatDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!password) {
      setStatus("Error: Admin password required to reorder.");
      return;
    }
    const dragIndex = Number(e.dataTransfer.getData("catIndex"));
    if (dragIndex === dropIndex || isNaN(dragIndex)) return;

    const newItems = [...apiCategories];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, moved);
    setApiCategories(newItems);

    const updates = newItems.map((c, idx) => ({ slug: c.slug, order: idx }));
    try {
      await fetch(`${API_URL}/api/categories/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${password}` },
        body: JSON.stringify({ updates })
      });
      setStatus("Category order saved.");
    } catch (err) {
      setStatus("Failed to save order.");
    }
  };

  return (
    <main className="adminContainer">
      <div className="adminBox">
        <div className="adminHeader">
          <Link href="/" className="backLink"><ArrowLeft size={16} /> Home</Link>
          <div className="adminBrand">
            <span className="brandMark">
              <img 
                src="/DS.jpg" 
                alt="" 
                width={28} 
                height={28} 
                style={{ borderRadius: "10px", objectFit: "contain" }} 
              />
            </span>
            <h1>Resource Admin</h1>
          </div>
          <p>Manage your design directory seamlessly</p>
        </div>

        <div className="inputGroup" style={{ marginBottom: "20px" }}>
          <label>Admin Password</label>
          <input
            type="password"
            placeholder="Enter secret key to make changes..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="tabs">
          <button 
            className={viewTab === "add" ? "active" : ""} 
            onClick={() => setViewTab("add")}
          >
            Add New
          </button>
          <button 
            className={viewTab === "manage" ? "active" : ""} 
            onClick={() => setViewTab("manage")}
          >
            Manage Data
          </button>
        </div>

        {status && <div className={`statusNotice ${status.includes("Success") || status.includes("deleted") || status.includes("created") ? "success" : "error"}`}>{status}</div>}

        {viewTab === "add" ? (
          <form onSubmit={handleSubmit} className="adminForm">
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
          </form>
        ) : (
          <div className="manageSection">
            <h3>Manage Websites <span className="helpText">(Drag to reorder)</span></h3>
            <div className="manageList">
              {apiResources.map((res, index) => (
                <div 
                  key={res.slug} 
                  className="manageItem"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("resIndex", index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleResDrop(e, index)}
                >
                  <div className="dragHandle" title="Drag to reorder"><GripVertical size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <strong>{res.name}</strong>
                    <span>{apiCategories.find(c => c.slug === res.category)?.name}</span>
                  </div>
                  <button onClick={() => handleDeleteResource(res.slug)} title="Delete Website" className="deleteBtn">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: "30px" }}>Manage Categories <span className="helpText">(Drag to reorder)</span></h3>
            <div className="manageList">
              {apiCategories.map((cat, index) => (
                <div 
                  key={cat.slug} 
                  className="manageItem"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("catIndex", index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleCatDrop(e, index)}
                >
                  <div className="dragHandle" title="Drag to reorder"><GripVertical size={16} /></div>
                  <div style={{ flex: 1 }}>
                    <strong>{cat.name}</strong>
                    <span>{apiResources.filter(r => r.category === cat.slug).length} websites</span>
                  </div>
                  <button onClick={() => handleDeleteCategory(cat.slug)} title="Delete Category" className="deleteBtn">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
          max-width: 550px;
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
        .tabs {
          display: flex;
          background: var(--surface-soft);
          padding: 4px;
          border-radius: 10px;
          margin-bottom: 24px;
        }
        .tabs button {
          flex: 1;
          padding: 10px;
          background: transparent;
          border: none;
          font-weight: 600;
          color: var(--muted);
          border-radius: 8px;
          cursor: pointer;
        }
        .tabs button.active {
          background: white;
          color: var(--ink);
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
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
          margin-bottom: 16px;
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

        .manageSection h3 {
          font-size: 1.1rem;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .helpText {
          font-size: 0.8rem;
          color: var(--muted);
          font-weight: 400;
        }
        .manageList {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 8px;
        }
        .manageItem {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--surface-soft);
          border: 1px solid var(--line);
          border-radius: 8px;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .manageItem:active {
          transform: scale(0.98);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .dragHandle {
          color: var(--muted);
          cursor: grab;
          display: grid;
          place-items: center;
        }
        .dragHandle:active { cursor: grabbing; }
        .manageItem div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .manageItem strong { font-size: 0.95rem; }
        .manageItem span { font-size: 0.8rem; color: var(--muted); }
        .deleteBtn {
          background: #fee2e2;
          color: #991b1b;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          display: grid;
          place-items: center;
        }
        .deleteBtn:hover {
          background: #fca5a5;
        }
      `}</style>
    </main>
  );
}

