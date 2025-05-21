"use client";

import { KeyboardEvent, FormEvent, useState, useRef } from "react";
import "./add-post.css";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

export default function Home() {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [postAdded, setPostAdded] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (postAdded) return;
    setPostAdded(true);

    try {
      const currentUserData = localStorage.getItem("currentUser");
      if (!currentUserData) {
        throw new Error("User not logged in");
      }
      const currentUser = JSON.parse(currentUserData);
      const token = currentUser.token;

      let response;
      if (image) {
        // If image is present, use FormData
        const formData = new FormData();
        formData.append("content", content);
        formData.append("image", image);

        response = await fetch(`${serverAddress}/posts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      } else {
        // No image, send JSON
        response = await fetch(`${serverAddress}/posts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
          }),
        });
      }

      const data = await response.json();
      if (!response.ok || data.error) {
        setError(data.error || data.message || "Failed to add post");
        setPostAdded(false);
        return;
      }

      // window.location.replace("/");
    } catch (error) {
      console.error("Error adding post:", error);
      setError(`Failed to add post: ${error}`);
    } finally {
      setPostAdded(false);
    }
  };

  return (
    <main>
      <h3>tags are not yet supported but content and images work</h3>
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

        <div
          id="image-upload"
          onClick={() => imageInputRef.current?.click()}
          style={{ cursor: "pointer" }}
        >
          <img src="/icons/upload-icon.png" alt="Upload icon" />
          <h3>Upload image</h3>
          <input
            type="file"
            accept="image/jpeg, image/png"
            style={{ display: "none" }}
            ref={imageInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setImage(e.target.files[0]);
              }
            }}
          />
          {image && <span style={{ color: "#c6a4ff" }}>{image.name}</span>}
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
