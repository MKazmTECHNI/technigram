"use client";
import { useState } from "react";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

export default function ReportBugPage() {
  const [type, setType] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    const res = await fetch(`${serverAddress}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, description, imageUrl }),
    });
    if (res.ok) {
      setStatus("Report sent!");
      setTitle("");
      setDescription("");
      setImageUrl("");
    } else {
      setStatus("Failed to send report.");
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "48px auto", padding: 24, background: "#181818", borderRadius: 16, color: "#fff" }}>
      <h2 style={{ color: "#c6a4ff" }}>Report a Bug / Suggestion</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label>
          Type:
          <select value={type} onChange={e => setType(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="bug">Bug</option>
            <option value="proposition">Proposition</option>
          </select>
        </label>
        <label>
          Title:
          <input value={title} onChange={e => setTitle(e.target.value)} required style={{ width: "100%", marginTop: 4 }} />
        </label>
        <label>
          Description:
          <textarea value={description} onChange={e => setDescription(e.target.value)} required style={{ width: "100%", marginTop: 4, minHeight: 80 }} />
        </label>
        <label>
          Image URL (optional):
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={{ width: "100%", marginTop: 4 }} />
        </label>
        <button type="submit" style={{ background: "#c6a4ff", color: "#181818", border: "none", borderRadius: 8, padding: "10px 0", fontWeight: 600 }}>Submit</button>
        {status && <div style={{ color: status === "Report sent!" ? "#7fff7f" : "#ff7f7f", marginTop: 8 }}>{status}</div>}
      </form>
    </div>
  );
}
