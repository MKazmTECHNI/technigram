"use client";
import { useState } from "react";
import "./report.css";

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
    const res = await fetch(`${serverAddress}/report`, {
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
    <div className="parent-container">
      <h2 className="report-title">Report a Bug / Suggestion</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Type:
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="bug">Bug</option>
            <option value="proposition">Proposition</option>
          </select>
        </label>
        <label>
          Title:
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Description:
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label>
          Image URL (optional):
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </label>
        <button type="submit" className="report-submit-btn">
          Submit
        </button>
        {status && (
          <div
            className={`report-status ${
              status === "Report sent!"
                ? "report-status-success"
                : "report-status-error"
            }`}
          >
            {status}
          </div>
        )}
      </form>
    </div>
  );
}
