"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Posts from "../../components/posts/posts";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

export default function ActivityPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState<{ [key: number]: boolean }>({});
  const [commentLikeLoading, setCommentLikeLoading] = useState<{ [key: number]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [key: number]: boolean }>({});
  const [commentError, setCommentError] = useState<{ [key: number]: string }>({});

  const getCurrentUser = () => {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem("currentUser");
    return data ? JSON.parse(data) : null;
  };

  const refreshComments = async (postId: number) => {
    try {
      const response = await fetch(`${serverAddress}/posts/${postId}`);
      if (!response.ok) return;
      const updatedPost = await response.json();
      setPosts((prev: any[]) =>
        prev.map((p: any) =>
          p.post_id === postId ? { ...p, comments: updatedPost.comments } : p,
        ),
      );
    } catch {}
  };

  const handlePostLike = async (postId: number) => {
    const user = getCurrentUser();
    if (!user) return;
    setPosts((prev: any[]) =>
      prev.map((p: any) =>
        p.post_id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p,
      ),
    );
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${serverAddress}/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev: any[]) =>
          prev.map((p: any) => (p.post_id === postId ? { ...p, likes: data.likes } : p)),
        );
      } else {
        setPosts((prev: any[]) =>
          prev.map((p: any) =>
            p.post_id === postId
              ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
              : p,
          ),
        );
      }
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleCommentLike = async (commentId: number, postId: number) => {
    const user = getCurrentUser();
    if (!user) return;
    setPosts((prev: any[]) =>
      prev.map((p: any) =>
        p.post_id === postId
          ? {
              ...p,
              comments: p.comments.map((c: any) =>
                c.comment_id === commentId
                  ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? (c.likes || 1) - 1 : (c.likes || 0) + 1 }
                  : c,
              ),
            }
          : p,
      ),
    );
    setCommentLikeLoading((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch(`${serverAddress}/posts/comments/${commentId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts((prev: any[]) =>
          prev.map((p: any) =>
            p.post_id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c: any) =>
                    c.comment_id === commentId ? { ...c, likes: data.likes } : c,
                  ),
                }
              : p,
          ),
        );
      } else {
        setPosts((prev: any[]) =>
          prev.map((p: any) =>
            p.post_id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c: any) =>
                    c.comment_id === commentId
                      ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? (c.likes || 1) - 1 : (c.likes || 0) + 1 }
                      : c,
                  ),
                }
              : p,
          ),
        );
      }
    } finally {
      setCommentLikeLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    fetch(`${serverAddress}/users/liked-posts`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  return (
    <div style={{ margin: "48px auto", maxWidth: 700 }}>
      <h1 style={{ color: "#c6a4ff", marginBottom: 24, textAlign: "center" }}>
        Your Activity
      </h1>
      <p style={{ color: "#969696", textAlign: "center", marginBottom: 24 }}>
        Posts you&apos;ve liked
      </p>
      {loading ? (
        <p style={{ textAlign: "center", color: "#c6a4ff" }}>Loading...</p>
      ) : posts.length === 0 ? (
        <p style={{ textAlign: "center", color: "#969696" }}>
          You haven&apos;t liked any posts yet.
        </p>
      ) : (
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
      )}
    </div>
  );
}