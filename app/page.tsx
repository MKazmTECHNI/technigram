"use client";

import "./styles.css";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Posts from "../components/posts/posts";
import Link from "next/link";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

type Comment = {
  comment_id: number;
  comment_content: string;
  username: string;
  profile_picture: string;
  likes?: number;
  isLiked?: boolean;
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
  isLiked?: boolean;
};

const POSTS_PER_PAGE = 10;

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [feedMode, setFeedMode] = useState<"foryou" | "latest">("latest");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const fetchedRef = useRef(false);

  const [likeLoading, setLikeLoading] = useState<{ [key: number]: boolean }>(
    {},
  );
  const [commentLikeLoading, setCommentLikeLoading] = useState<{
    [key: number]: boolean;
  }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>(
    {},
  );
  const [commentLoading, setCommentLoading] = useState<{
    [key: number]: boolean;
  }>({});
  const [commentError, setCommentError] = useState<{ [key: number]: string }>(
    {},
  );

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const getCurrentUser = () => currentUser;

  const refreshComments = async (postId: number) => {
    try {
      const response = await fetch(`${serverAddress}/posts/${postId}`);
      if (!response.ok) return;
      const updatedPost = await response.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.post_id === postId ? { ...p, comments: updatedPost.comments } : p,
        ),
      );
    } catch {}
  };

  const handlePostLike = async (postId: number) => {
    const user = getCurrentUser();
    if (!user) return;

    // Optimistic toggle
    setPosts((prev) =>
      prev.map((p) =>
        p.post_id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );

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
            p.post_id === postId ? { ...p, likes: data.likes } : p,
          ),
        );
      } else {
        // Revert on error
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
              : p,
          ),
        );
        const err = await res.json();
        if (err.muted) {
          alert(
            err.error +
              (err.retryAfter
                ? ` Try again in ${err.retryAfter} seconds.`
                : ""),
          );
        }
      }
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleCommentLike = async (commentId: number, postId: number) => {
    const user = getCurrentUser();
    if (!user) return;

    // Optimistic toggle
    setPosts((prev) =>
      prev.map((p) =>
        p.post_id === postId
          ? {
              ...p,
              comments: p.comments.map((c: any) =>
                c.comment_id === commentId
                  ? {
                      ...c,
                      isLiked: !c.isLiked,
                      likes: c.isLiked ? (c.likes || 1) - 1 : (c.likes || 0) + 1,
                    }
                  : c,
              ),
            }
          : p,
      ),
    );

    setCommentLikeLoading((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch(
        `${serverAddress}/posts/comments/${commentId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c: any) =>
                    c.comment_id === commentId
                      ? { ...c, likes: data.likes }
                      : c,
                  ),
                }
              : p,
          ),
        );
      } else {
        // Revert on error
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c: any) =>
                    c.comment_id === commentId
                      ? {
                          ...c,
                          isLiked: !c.isLiked,
                          likes: c.isLiked ? (c.likes || 1) - 1 : (c.likes || 0) + 1,
                        }
                      : c,
                  ),
                }
              : p,
          ),
        );
        const err = await res.json();
        if (err.muted) {
          alert(
            err.error +
              (err.retryAfter
                ? ` Try again in ${err.retryAfter} seconds.`
                : ""),
          );
        }
      }
    } finally {
      setCommentLikeLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const fetchPosts = useCallback(async (currentOffset: number, opts?: { mode?: "foryou" | "latest"; token?: string }) => {
    const activeMode = opts?.mode || feedMode;
    const isInitial = currentOffset === 0;

    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const user = getCurrentUser();
      const token = opts?.token || (user ? user.token : null);
      let endpoint: string;
      if (activeMode === "foryou" && token) {
        endpoint = `${serverAddress}/feed/foryou?offset=${currentOffset}&limit=${POSTS_PER_PAGE}`;
      } else {
        endpoint = `${serverAddress}/feed/latest?offset=${currentOffset}&limit=${POSTS_PER_PAGE}`;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();

      if (isInitial) {
        setPosts(data.posts);
      } else {
        setPosts((prev) => [...prev, ...data.posts]);
      }
      setHasMore(currentOffset + POSTS_PER_PAGE < data.total);
      setOffset(currentOffset + POSTS_PER_PAGE);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedMode]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Hydration-safe user check
    const userData = localStorage.getItem("currentUser");
    const user = userData ? JSON.parse(userData) : null;
    setCurrentUser(user);
    setMounted(true);
    setShowLoginPrompt(!user);

    const mode = user ? "foryou" : "latest";
    setFeedMode(mode);
    fetchPosts(0, { mode, token: user?.token });
  }, [fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      const threshold = document.body.offsetHeight - 400;
      if (scrollBottom >= threshold) {
        const token = currentUser?.token;
        fetchPosts(offset, { token });
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, offset, fetchPosts]);

  return (
    <>
      {showLoginPrompt && (
        <div style={{ textAlign: "center", margin: "16px 0", color: "#c6a4ff" }}>
          <Link href="/login" style={{ color: "#c6a4ff", fontWeight: "bold" }}>
            Log in
          </Link>{" "}
          for a personalized feed. Showing latest posts.
        </div>
      )}
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
      {loading && <p style={{ textAlign: "center", color: "#c6a4ff", marginTop: 20 }}>Loading posts...</p>}
      {loadingMore && <p style={{ textAlign: "center", color: "#c6a4ff", marginTop: 20 }}>Loading more...</p>}
      {error && <p style={{ textAlign: "center", color: "red", marginTop: 20 }}>{error}</p>}
      {!hasMore && posts.length > 0 && (
        <p style={{ textAlign: "center", color: "#969696", marginTop: 20, marginBottom: 40 }}>You&apos;ve seen all posts!</p>
      )}
    </>
  );
}