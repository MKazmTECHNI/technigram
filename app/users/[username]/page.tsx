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
  isLiked?: boolean;
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
  isLiked?: boolean;
};

type UserProfile = {
  id: number;
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<{ [key: number]: boolean }>(
    {},
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
          p.post_id === postId ? { ...p, comments: updatedPost.comments } : p,
        ),
      );
    } catch {}
  };

  // Like/unlike a post
  const handlePostLike = async (postId: number) => {
    const user = getCurrentUser();
    if (!user) return;

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
        setPosts((prev) =>
          prev.map((p) =>
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

  // Like/unlike a comment
  const handleCommentLike = async (commentId: number, postId: number) => {
    const user = getCurrentUser();
    if (!user) return;

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
          `${serverAddress}/users/by-username/${username}`,
        );
        if (!res.ok) {
          window.location.replace("/");
          return;
        }
        const data = await res.json();
        setProfile(data);

        // Check follow status
        const user = getCurrentUser();
        if (user && data.id) {
          try {
            const followRes = await fetch(
              `${serverAddress}/social/follow/${data.id}/status`,
              { headers: { Authorization: `Bearer ${user.token}` } },
            );
            if (followRes.ok) {
              const followData = await followRes.json();
              setIsFollowing(followData.following);
            }
          } catch {}
        }
      } catch {
        window.location.replace("/");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    const user = getCurrentUser();
    if (!user || !profile) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`${serverAddress}/social/follow/${profile.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
      }
    } catch {}
    setFollowLoading(false);
  };

  useEffect(() => {
    if (!username) return;
    async function fetchUserPosts() {
      try {
        const res = await fetch(`${serverAddress}/users/${username}/posts`);
        if (res.ok) {
          const data = await res.json();
          setPosts(data);
        }
      } catch {}
    }
    fetchUserPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
        {getCurrentUser() && Number(getCurrentUser().id) !== profile.id && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{
              marginTop: 8,
              padding: "10px 32px",
              borderRadius: 12,
              border: "none",
              fontWeight: 600,
              fontSize: "1em",
              cursor: followLoading ? "wait" : "pointer",
              background: isFollowing ? "#c6a4ff" : "#3a3a3a",
              color: isFollowing ? "#181818" : "#fff",
            }}
          >
            {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
          </button>
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
