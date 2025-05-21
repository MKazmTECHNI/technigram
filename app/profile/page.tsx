"use client";

import React, { useState, useEffect } from "react";
import "./profile.css";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

export default function ProfilePage() {
  const [profilePicture, setProfilePicture] = useState<string>(
    `${serverAddress}/images/profiles/default-profile.png`
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch the userId and profile picture when the component loads
  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      try {
        const parsedUser = JSON.parse(currentUser);
        setUserId(parsedUser.id);
        setUsername(parsedUser.username);
      } catch (e) {
        console.error("Error parsing currentUser from localStorage:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchProfilePicture() {
      try {
        const response = await fetch(
          `${serverAddress}/profile/picture/${userId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch profile picture");
        }
        const data = await response.json();
        setProfilePicture(data.filePath);
      } catch (error) {
        // Always use backend default image URL
        setProfilePicture(
          `${serverAddress}/images/profiles/default-profile.png`
        );
      }
    }

    fetchProfilePicture();
  }, [userId]);

  // Handle profile picture upload
  const handleProfilePictureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePicture", file);

    // Get token from localStorage
    const currentUserData = localStorage.getItem("currentUser");
    let token = "";
    if (currentUserData) {
      try {
        const currentUser = JSON.parse(currentUserData);
        token = currentUser.token;
      } catch (e) {
        console.error("Error parsing currentUser from localStorage:", e);
      }
    }

    try {
      const response = await fetch(`${serverAddress}/profile/upload-picture`, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload profile picture");
      }

      const data = await response.json();
      // Add cache-busting query param to force reload
      setProfilePicture(data.filePath + "?t=" + Date.now());
      setSuccessMsg("Profile picture uploaded successfully!");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setUsernameError("Error uploading profile picture");
      setTimeout(() => setUsernameError(""), 2000);
    }
  };

  // Handle username change
  const handleUsernameChange = async () => {
    setUsernameError("");
    setSuccessMsg("");
    if (!newUsername || newUsername.length < 3 || newUsername.length > 28) {
      setUsernameError("Username must be 3-28 characters.");
      return;
    }
    const currentUserData = localStorage.getItem("currentUser");
    let token = "";
    if (currentUserData) {
      try {
        const currentUser = JSON.parse(currentUserData);
        token = currentUser.token;
      } catch (e) {
        setUsernameError("Error reading user token.");
        return;
      }
    }
    try {
      const response = await fetch(`${serverAddress}/users/changeUsername`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: newUsername }),
      });
      const data = await response.json();
      if (!response.ok) {
        setUsernameError(data.message || "Failed to update username");
        return;
      }
      setUsername(newUsername);
      setEditingUsername(false);
      setSuccessMsg("Username updated!");
      // Update localStorage
      const currentUser = localStorage.getItem("currentUser");
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        parsed.username = newUsername;
        localStorage.setItem("currentUser", JSON.stringify(parsed));
      }
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (error) {
      setUsernameError("Failed to update username");
    }
  };

  return (
    <div className="profile-card">
      <h1>Profile</h1>
      <div className="profile-picture-section">
        <img
          id="profilePicture"
          src={profilePicture}
          alt="Profile"
          width="128"
          height="128"
        />
        <label className="upload-label">
          <input
            type="file"
            accept="image/jpeg, image/png"
            onChange={handleProfilePictureUpload}
            style={{ display: "none" }}
          />
          <span className="upload-btn">Change Picture</span>
        </label>
      </div>
      <div className="username-section">
        {editingUsername ? (
          <>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              maxLength={28}
              minLength={3}
              className="username-input"
            />
            <button className="save-btn" onClick={handleUsernameChange}>
              Save
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                setEditingUsername(false);
                setUsernameError("");
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="username">{username}</span>
            <button
              className="edit-btn"
              onClick={() => {
                setEditingUsername(true);
                setNewUsername(username);
              }}
            >
              Edit
            </button>
          </>
        )}
      </div>
      {usernameError && <div className="error">{usernameError}</div>}
      {successMsg && <div className="success">{successMsg}</div>}
    </div>
  );
}
