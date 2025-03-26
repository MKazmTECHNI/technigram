"use client";

import "./womp-womp.css";
import { useState } from "react";

export default function Home() {
  const [id, setId] = useState("");
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");

  function setLocalStorageItem() {
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        id: id,
        username: username,
        token: token,
      })
    );
  }

  return (
    <div className="womp-womp-container">
      <h1>Hej skibidi, welcome to womp-womp czyli dev-site'a</h1>
      <h3>
        Hi input your id, token and name to be able to mimic technigram in your
        localhost
      </h3>
      <div className="inputs">
        <input
          type="number"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="id"
        />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
        />
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="token"
        />
        <button onClick={setLocalStorageItem}>Submit</button>
      </div>
    </div>
  );
}
