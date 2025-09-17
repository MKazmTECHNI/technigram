"use client";

import "./styles.css";
import React, { useEffect, useState, useRef } from "react";
import Posts from "../components/posts/posts";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

type Comment = {
  comment_id: number;
  comment_content: string;
  username: string;
  profile_picture: string;
  likes?: number;
};

type Post = {
  post_id: number;
  content: string;
  creatorUsername: string;
  trueName: string;
  creatorProfilePicture: string;
  likes: number;
  date: string;
  image?: string | null;
  comments: Comment[];
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fetchedRef = useRef(false); // Prevent double fetch

  const [likeLoading, setLikeLoading] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [commentLikeLoading, setCommentLikeLoading] = useState<{
    [key: number]: boolean;
  }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>(
    {}
  );
  const [commentLoading, setCommentLoading] = useState<{
    [key: number]: boolean;
  }>({});
  const [commentError, setCommentError] = useState<{ [key: number]: string }>(
    {}
  );

  // Helper to check if user is logged in
  const getCurrentUser = () => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem("currentUser");
    return data ? JSON.parse(data) : null;
  };

  // Refresh comments for a single post after adding a comment
  const refreshComments = async (postId: number) => {
    try {
      const response = await fetch(`${serverAddress}/posts/${postId}`);
      if (!response.ok) return;
      const updatedPost = await response.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId ? { ...p, comments: updatedPost.comments } : p
        )
      );
    } catch {}
  };

  // Like/unlike a post
  const handlePostLike = async (postId: number) => {
    const user = getCurrentUser();
    if (!user) return;
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${serverAddress}/posts/${postId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId ? { ...p, likes: data.likes } : p
          )
        );
      } else {
        const err = await res.json();
        if (err.muted) {
          alert(
            err.error +
              (err.retryAfter ? ` Try again in ${err.retryAfter} seconds.` : "")
          );
        }
      }
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Like/unlike a comment
  const handleCommentLike = async (commentId: number, postId: number) => {
    const user = getCurrentUser();
    if (!user) return;
    setCommentLikeLoading((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch(
        `${serverAddress}/posts/comments/${commentId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c: any) =>
                    c.comment_id === commentId ? { ...c, likes: data.likes } : c
                  ),
                }
              : p
          )
        );
      } else {
        const err = await res.json();
        if (err.muted) {
          alert(
            err.error +
              (err.retryAfter ? ` Try again in ${err.retryAfter} seconds.` : "")
          );
        }
      }
    } finally {
      setCommentLikeLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  // Add post handler
  const handleAddPost = async (content: string, image?: File) => {
    const user = getCurrentUser();
    if (!user) return;
    try {
      const res = await fetch(`${serverAddress}/posts`, {
        method: "POST",
        headers: image
          ? {
              Authorization: `Bearer ${user.token}`,
            }
          : {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.token}`,
            },
        body: image
          ? (() => {
              const formData = new FormData();
              formData.append("content", content);
              if (image) formData.append("image", image);
              return formData;
            })()
          : JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.muted) {
          alert(
            err.error +
              (err.retryAfter ? ` Try again in ${err.retryAfter} seconds.` : "")
          );
        } else {
          alert(err.error || "Failed to add post");
        }
        return false;
      }
      return true;
    } catch {
      alert("Failed to add post");
      return false;
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchPosts() {
      try {
        const postCountResponse = await fetch(`${serverAddress}/posts/count`);
        if (!postCountResponse.ok) {
          throw new Error("Failed to fetch post count");
        }
        const postCount = await postCountResponse.json();
        const totalPosts = postCount.numberOfPosts;

        // Fetch posts one by one
        for (let i = totalPosts; i > 0; i--) {
          try {
            const response = await fetch(`${serverAddress}/posts/${i}`);
            if (!response.ok) {
              console.warn(`Failed to fetch post with ID ${i}`);
              continue;
            }
            const post = await response.json();
            setPosts((prevPosts) => [...prevPosts, post]);
          } catch (postError) {
            console.warn(postError);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  return (
    <Posts
      posts={posts}
      serverAddress={serverAddress}
      likeLoading={likeLoading}
      commentLikeLoading={commentLikeLoading}
      handlePostLike={handlePostLike}
      handleCommentLike={handleCommentLike}
      getCurrentUser={getCurrentUser}
      commentInputs={commentInputs}
      setCommentInputs={setCommentInputs}
      commentLoading={commentLoading}
      commentError={commentError}
      setCommentLoading={setCommentLoading}
      setCommentError={setCommentError}
      refreshComments={refreshComments}
    />
  );
}
