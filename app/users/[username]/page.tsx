"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  trueName?: string;
  creatorProfilePicture?: string;
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
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>(
    {}
  );
  const [commentLoading, setCommentLoading] = useState<{
    [key: number]: boolean;
  }>({});
  const [commentError, setCommentError] = useState<{ [key: number]: string }>(
    {}
  );
  const [likeLoading, setLikeLoading] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [commentLikeLoading, setCommentLikeLoading] = useState<{
    [key: number]: boolean;
  }>({});

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
              if (postDetails.ok) {
                const full = await postDetails.json();
                return {
                  ...post,
                  comments: full.comments || [],
                  creatorUsername: username,
                  trueName: profile?.true_name,
                  creatorProfilePicture: profile?.profile_picture,
                };
              }
              return {
                ...post,
                comments: [],
                creatorUsername: username,
                trueName: profile?.true_name,
                creatorProfilePicture: profile?.profile_picture,
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
      {posts.length === 0 ? (
        <div style={{ color: "#969696", textAlign: "center" }}>
          No posts yet.
        </div>
      ) : (
        <div className="posts" style={{ gap: 21 }}>
          {posts.map((post) => {
            const mostLikedComment =
              post.comments.length > 0
                ? [...post.comments].sort(
                    (a, b) => (b.likes || 0) - (a.likes || 0)
                  )[0]
                : null;
            const otherComments =
              post.comments.length > 1
                ? [...post.comments]
                    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                    .slice(1)
                : [];
            const postId = post.post_id;
            const commentCount = post.comments.length;

            return (
              <div key={postId} className="post">
                <div>
                  <Link
                    href={`/users/${post.creatorUsername}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      textDecoration: "none",
                    }}
                  >
                    <img
                      src={
                        post.creatorProfilePicture ||
                        `${serverAddress}/images/profiles/default-profile.png`
                      }
                      alt="pfp"
                      className="post-pfp"
                    />
                    <div className="post-author-container">
                      <div className="upper">
                        <p className="post-author">@{post.creatorUsername}</p>
                        <p className="date">
                          {new Date(post.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          })}
                        </p>
                      </div>
                      <p className="post-author-name">{post.trueName}</p>
                    </div>
                  </Link>
                </div>
                <p>{post.content}</p>
                <div className="post-tags"></div>
                {post.image && post.image !== "null" && post.image !== "" && (
                  <img
                    src={post.image}
                    className="post-image"
                    alt="Post"
                    style={{ cursor: "pointer" }}
                    onClick={() => setModalImage(post.image!)}
                  />
                )}
                <div className="post-stats-container">
                  <img
                    src="../icons/heart-icon.svg"
                    alt=""
                    className="heart-icon icon"
                    style={{
                      cursor: getCurrentUser() ? "pointer" : "not-allowed",
                      opacity: likeLoading[postId] ? 0.5 : 1,
                    }}
                    onClick={() =>
                      getCurrentUser() && !likeLoading[postId]
                        ? handlePostLike(postId)
                        : undefined
                    }
                    title={
                      getCurrentUser() ? "Like/unlike post" : "Login to like"
                    }
                  />
                  <p className="post-likes">{post.likes}</p>
                  <img
                    src="../icons/speech-bubble.png"
                    className="comment-icon icon"
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      setOpenComments((prev) => ({
                        ...prev,
                        [postId]: !prev[postId],
                      }))
                    }
                  />
                  <p
                    className="post-likes post-comments"
                    style={{ minWidth: 24 }}
                  >
                    {commentCount}
                  </p>
                </div>
                {/* Most liked comment */}
                {mostLikedComment && (
                  <div
                    className="post-comment-container"
                    style={{
                      background: "#232323",
                      borderRadius: 10,
                      margin: "10px 0 0 0",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Link
                      href={`/users/${mostLikedComment.username}`}
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={`${serverAddress}${mostLikedComment.profile_picture}`}
                        alt="pfp"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    </Link>
                    <div>
                      <Link
                        href={`/users/${mostLikedComment.username}`}
                        style={{
                          color: "#c6a4ff",
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        @{mostLikedComment.username}
                      </Link>
                      <span
                        style={{
                          marginLeft: 8,
                          color: "#969696",
                          fontSize: "0.95em",
                          cursor: getCurrentUser() ? "pointer" : "not-allowed",
                          opacity: commentLikeLoading[
                            mostLikedComment.comment_id
                          ]
                            ? 0.5
                            : 1,
                        }}
                        onClick={() =>
                          getCurrentUser() &&
                          !commentLikeLoading[mostLikedComment.comment_id]
                            ? handleCommentLike(
                                mostLikedComment.comment_id,
                                postId
                              )
                            : undefined
                        }
                        title={
                          getCurrentUser()
                            ? "Like/unlike comment"
                            : "Login to like"
                        }
                      >
                        {mostLikedComment.likes ?? 0} likes
                      </span>
                      <div style={{ color: "#fff" }}>
                        {mostLikedComment.comment_content}
                      </div>
                    </div>
                  </div>
                )}
                {/* All comments (except most liked), toggled */}
                {openComments[postId] && otherComments.length > 0 && (
                  <div
                    className="post-comment-list"
                    style={{
                      marginTop: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {otherComments.map((comment, cidx) => (
                      <div
                        key={comment.comment_id}
                        style={{
                          background: "#232323",
                          borderRadius: 10,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Link
                          href={`/users/${comment.username}`}
                          style={{ textDecoration: "none" }}
                        >
                          <img
                            src={`${serverAddress}${comment.profile_picture}`}
                            alt="pfp"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        </Link>
                        <div>
                          <Link
                            href={`/users/${comment.username}`}
                            style={{
                              color: "#c6a4ff",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            @{comment.username}
                          </Link>
                          <span
                            style={{
                              marginLeft: 8,
                              color: "#969696",
                              fontSize: "0.95em",
                              cursor: getCurrentUser()
                                ? "pointer"
                                : "not-allowed",
                              opacity: commentLikeLoading[comment.comment_id]
                                ? 0.5
                                : 1,
                            }}
                            onClick={() =>
                              getCurrentUser() &&
                              !commentLikeLoading[comment.comment_id]
                                ? handleCommentLike(comment.comment_id, postId)
                                : undefined
                            }
                            title={
                              getCurrentUser()
                                ? "Like/unlike comment"
                                : "Login to like"
                            }
                          >
                            {comment.likes ?? 0} likes
                          </span>
                          <div style={{ color: "#fff" }}>
                            {comment.comment_content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {modalImage && (
        <div
          className="image-modal"
          onClick={() => setModalImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 1000,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
        >
          <div style={{ position: "relative" }}>
            <img
              src={modalImage}
              alt="Full"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "16px",
                boxShadow: "0 0 24px #000",
                background: "#222",
                display: "block",
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={modalImage}
              download
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "#181818cc",
                borderRadius: "8px",
                padding: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => e.stopPropagation()}
              title="Download image"
            >
              <img
                src="/icons/download_icon.png"
                alt="Download"
                style={{ width: 28, height: 28 }}
              />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
