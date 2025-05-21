"use client";

import { useEffect, useState } from "react";
import "../styles.css"; // Reuse post styles for card look

type ChangelogEntry = {
  id: number;
  version: string;
  title: string;
  description: string;
  created_at: string;
};

type VersionGroup = {
  version: string;
  entries: ChangelogEntry[];
};

function groupByVersion(entries: ChangelogEntry[]): VersionGroup[] {
  const map: { [version: string]: ChangelogEntry[] } = {};
  for (const entry of entries) {
    if (!map[entry.version]) map[entry.version] = [];
    map[entry.version].push(entry);
  }
  // Sort versions descending (latest first)
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }))
    .map(([version, entries]) => ({ version, entries }));
}

export default function ChangelogPage() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChangelog() {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_SERVER_ADDRESS + "/changelog"
        );
        const data = await res.json();
        setChangelog(data);
      } catch {
        setChangelog([]);
      } finally {
        setLoading(false);
      }
    }
    fetchChangelog();
  }, []);

  const grouped = groupByVersion(changelog);

  return (
    <div style={{ margin: "48px auto", maxWidth: 700 }}>
      <h1
        style={{
          color: "#c6a4ff",
          marginBottom: 24,
          textAlign: "center",
          fontWeight: 700,
          fontSize: "2.2em",
          letterSpacing: "1px",
        }}
      >
        Changelog
      </h1>
      {loading ? (
        <p>Loading...</p>
      ) : grouped.length === 0 ? (
        <p style={{ color: "#969696", textAlign: "center" }}>
          No changelog entries yet.
        </p>
      ) : (
        <div
          className="changelog-list"
          style={{ display: "flex", flexDirection: "column", gap: 28 }}
        >
          {grouped.map((group, idx) => (
            <div key={group.version}>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "1.15em",
                  color: "#c6a4ff",
                  cursor: idx === 0 ? "default" : "pointer",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 6,
                }}
                onClick={() =>
                  idx !== 0
                    ? setExpanded(
                        expanded === group.version ? null : group.version
                      )
                    : undefined
                }
              >
                Version {group.version}
                {idx !== 0 && (
                  <span style={{ fontSize: "0.9em", color: "#aaa" }}>
                    [{expanded === group.version ? "Hide" : "Show"}]
                  </span>
                )}
              </div>
              {(idx === 0 || expanded === group.version) && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="changelog-entry"
                      style={{
                        background: "#181818",
                        border: "1px solid #595959",
                        borderRadius: 14,
                        padding: "18px 22px",
                        boxShadow: "0 0 15px rgba(0,0,0,0.15)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "1.08em",
                          color: "#fff",
                        }}
                      >
                        {entry.title}
                      </div>
                      <div style={{ color: "#c6a4ff", fontSize: "0.97em" }}>
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                      <div style={{ color: "#eaeaea", fontSize: "1em" }}>
                        {entry.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
