"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;
type Tab = "users" | "posts" | "comments" | "database";

function retrieveUser() {
  const userData = localStorage.getItem("currentUser");
  return userData ? JSON.parse(userData) : null;
}

export default function AdminPanel() {
  const router = useRouter();
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [tables, setTables] = useState<{ name: string }[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const headers = () => {
    const { id, token } = retrieveUser() || {};
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-User-Id": id,
    };
  };

  useEffect(() => {
    const user = retrieveUser();
    if (!user?.id || !user?.token) {
      router.replace("/");
      return;
    }
    setPermissionChecked(true);
    fetch(`${serverAddress}/api/db/tables`, { headers: headers() })
      .then((res) => res.json())
      .then((data) => setTables(Array.isArray(data.tables) ? data.tables : []));
  }, [router]);

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch(`${serverAddress}/api/admin/users`, { headers: headers() });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  const loadPosts = async () => {
    setLoading(true);
    const res = await fetch(`${serverAddress}/api/admin/posts`, { headers: headers() });
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  };

  const loadComments = async () => {
    setLoading(true);
    const res = await fetch(`${serverAddress}/api/admin/comments`, { headers: headers() });
    const data = await res.json();
    setComments(data.comments || []);
    setLoading(false);
  };

  const loadTable = async (table: string) => {
    setSelectedTable(table);
    setLoading(true);
    const res = await fetch(`${serverAddress}/api/db/tables/${table}`, { headers: headers() });
    const data = await res.json();
    setTableData(data.data || []);
    setLoading(false);
  };

  const adminAction = async (url: string, body: any, cb?: () => void) => {
    await fetch(`${serverAddress}${url}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    cb?.();
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "users") loadUsers();
    else if (t === "posts") loadPosts();
    else if (t === "comments") loadComments();
  };

  if (!permissionChecked) return null;

  const tabStyle = (t: Tab) => ({
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: tab === t ? "bold" : "normal",
    background: tab === t ? "#ddd" : "transparent",
    border: "none",
  });

  return (
    <div style={{ padding: 32 }}>
      <h1>Admin Panel</h1>
      <div style={{ marginBottom: 16, display: "flex", gap: 4 }}>
        <button style={tabStyle("users")} onClick={() => switchTab("users")}>Users</button>
        <button style={tabStyle("posts")} onClick={() => switchTab("posts")}>Posts</button>
        <button style={tabStyle("comments")} onClick={() => switchTab("comments")}>Comments</button>
        <button style={tabStyle("database")} onClick={() => switchTab("database")}>Database</button>
      </div>

      {loading && <p>Loading...</p>}

      {tab === "users" && !loading && (
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>ID</th><th>Username</th><th>True Name</th><th>Email</th><th>Permission</th>
              <th>Timeout</th><th>CSS Disabled</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.username}</td><td>{u.true_name}</td>
                <td>{u.email}</td><td>{u.permission}</td>
                <td>{u.timeout || "-"}</td>
                <td>{u.custom_css_disabled ? "Yes" : "No"}</td>
                <td style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <button onClick={() => adminAction(`/api/admin/mute/${u.id}`, { duration: 60 }, loadUsers)}>Mute 1h</button>
                  <button onClick={() => adminAction(`/api/admin/mute/${u.id}`, { duration: 1440 }, loadUsers)}>Mute 24h</button>
                  <button onClick={() => adminAction(`/api/admin/mute/${u.id}`, { duration: null }, loadUsers)}>Unmute</button>
                  <button onClick={() => adminAction(`/api/admin/toggle-css/${u.id}`, {}, loadUsers)}>Toggle CSS</button>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) adminAction(`/api/admin/change-permission/${u.id}`, { permission: e.target.value }, loadUsers);
                    }}
                  >
                    <option value="" disabled>Change perm</option>
                    <option value="uczen">Student</option>
                    <option value="nauczyciel">Teacher</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                    <option value="dyrektor">Principal</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "posts" && !loading && (
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th>ID</th><th>Content</th><th>Creator</th><th>Likes</th><th>Hidden</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {posts.map((p: any) => (
              <tr key={p.post_id}>
                <td>{p.post_id}</td>
                <td>{p.content?.substring(0, 80)}</td>
                <td>{p.username}</td>
                <td>{p.likes}</td>
                <td>{p.hidden ? "Yes" : "No"}</td>
                <td>{p.created_at}</td>
                <td>
                  <button onClick={() => adminAction(`/api/admin/hide-post/${p.post_id}`, {}, loadPosts)}>
                    {p.hidden ? "Unhide" : "Hide"}
                  </button>
                  <button onClick={() => adminAction(`/api/admin/delete-post/${p.post_id}`, {}, loadPosts)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "comments" && !loading && (
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th>ID</th><th>Content</th><th>Post ID</th><th>Creator</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {comments.map((c: any) => (
              <tr key={c.comment_id}>
                <td>{c.comment_id}</td>
                <td>{c.comment_content?.substring(0, 80)}</td>
                <td>{c.post_id}</td>
                <td>{c.username}</td>
                <td>{c.created_at}</td>
                <td>
                  <button onClick={() => adminAction(`/api/admin/delete-comment/${c.comment_id}`, {}, loadComments)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "database" && (
        <div>
          <h2>Tables</h2>
          <ul>
            {tables.map((t) => (
              <li key={t.name}>
                <button onClick={() => loadTable(t.name)}>{t.name}</button>
              </li>
            ))}
          </ul>
          {selectedTable && (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <h3>Table: {selectedTable}</h3>
              <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {tableData[0] && Object.keys(tableData[0]).map((col) => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val: any, j) => <td key={j}>{String(val)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}