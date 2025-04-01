"use client";

import { KeyboardEvent, FormEvent, useState } from "react";
import "./add-post.css";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

export default function Home() {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [postAdded, setPostAdded] = useState(false);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // ✅ Correct event type
    if (postAdded) return;

    setPostAdded(true);

    try {
      const currentUserData = localStorage.getItem("currentUser");
      if (!currentUserData) {
        throw new Error("User not logged in");
      }

      const currentUser = JSON.parse(currentUserData);
      const creatorId = currentUser.id;
      const token = currentUser.token;

      const response = await fetch(`${serverAddress}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          creator_id: creatorId,
          content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! Status: ${response.status} - ${errorData.message}`
        );
      }

      console.log("Added new post:", await response.json());

      window.location.replace("/");
    } catch (error) {
      console.error("Error adding post:", error);
      setError(`Failed to add post: ${error}`);
    } finally {
      setPostAdded(false);
    }
  };

  return (
    <main>
      <h3>
        just saying - for now only text content works, tags and images are still
        off
      </h3>
      <form id="addPostForm" onSubmit={handleSubmit}>
        <h1>Create New Post</h1>

        <textarea
          id="content"
          name="content"
          placeholder="Share your thoughts, your feelings, your code..."
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
        ></textarea>

        <input type="text" id="tags" name="tags" placeholder="Add tags..." />

        <div id="image-upload">
          <img src="/icons/upload-icon.png" alt="Upload icon" />
          <h3>Upload image</h3>
        </div>

        <button id="formSubmitButton" type="submit">
          Publish Post
        </button>
      </form>

      {error && (
        <div id="error" className="error">
          {error}
        </div>
      )}
    </main>
  );
}
