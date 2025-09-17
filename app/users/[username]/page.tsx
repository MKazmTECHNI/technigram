"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Posts from "../../../components/posts/posts";

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
  image?: string | null;
  date: string;
  likes: number;
  comments: Comment[];
  creatorUsername: string;
  trueName: string;
  creatorProfilePicture: string;
};

type UserProfile = {
  username: string;
  true_name?: string;
  profile_picture?: string;
  created_at?: string;
};

export default function UserProfilePage() {
  const params = useParams();
  const username =
    typeof params.username === "string"
      ? params.username
      : Array.isArray(params.username)
      ? params.username[0]
      : "";
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
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
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<{ [key: number]: boolean }>(
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
      }
    } finally {
      setCommentLikeLoading((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  useEffect(() => {
    if (!username) return;
    async function fetchProfile() {
      try {
        const res = await fetch(
          `${serverAddress}/users/by-username/${username}`
        );
        if (!res.ok) {
          window.location.replace("/");
          return;
        }
        const data = await res.json();
        setProfile(data);
      } catch {
        window.location.replace("/");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    async function fetchUserPosts() {
      try {
        const res = await fetch(`${serverAddress}/users/${username}/posts`);
        if (res.ok) {
          const data = await res.json();
          // For each post, fetch comments and author info (to match homepage)
          const postsWithDetails = await Promise.all(
            data.map(async (post: any) => {
              const postDetails = await fetch(
                `${serverAddress}/posts/${post.post_id}`
              );
              const safeTrueName = profile?.true_name ?? "";
              const safeProfilePicture =
                profile?.profile_picture ??
                `${serverAddress}/images/profiles/default-profile.png`;
              if (postDetails.ok) {
                const full = await postDetails.json();
                return {
                  ...post,
                  comments: full.comments || [],
                  creatorUsername: username,
                  trueName: safeTrueName,
                  creatorProfilePicture: safeProfilePicture,
                };
              }
              return {
                ...post,
                comments: [],
                creatorUsername: username,
                trueName: safeTrueName,
                creatorProfilePicture: safeProfilePicture,
              };
            })
          );
          setPosts(postsWithDetails);
        }
      } catch {}
    }
    fetchUserPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, profile?.true_name, profile?.profile_picture]);

  if (loading)
    return (
      <div style={{ color: "#c6a4ff", textAlign: "center", marginTop: 40 }}>
        Loading profile...
      </div>
    );
  if (!profile) return null;

  return (
    <div style={{ margin: "48px auto", maxWidth: 700 }}>
      <div
        style={{
          maxWidth: 400,
          margin: "0 auto 32px auto",
          background: "#181818",
          borderRadius: 18,
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          padding: "32px 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          color: "#fff",
        }}
      >
        <img
          src={
            profile.profile_picture ||
            `${serverAddress}/images/profiles/default-profile.png`
          }
          alt="Profile"
          width={256}
          height={256}
          style={{
            borderRadius: "50%",
            border: "3px solid #c6a4ff",
            objectFit: "cover",
            background: "#222",
            marginBottom: 16,
          }}
        />
        <h2 style={{ color: "#c6a4ff", margin: 0, fontSize: "1.8em" }}>
          @{profile.username}
        </h2>
        {profile.true_name && (
          <div style={{ color: "#969696", fontSize: "1.3em" }}>
            {profile.true_name}
          </div>
        )}
        {profile.created_at && (
          <div style={{ color: "#7e7e7e", fontSize: "1.05em", marginTop: -10 }}>
            Joined{" "}
            {new Date(profile.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        )}
      </div>
      <h3 style={{ color: "#c6a4ff", marginBottom: 18, fontSize: "1.25em" }}>
        Posts
      </h3>
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
    </div>
  );
}
