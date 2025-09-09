"use client";

import "./styles.css";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

type Comment = {
  comment_id: number;
  comment_content: string;
  username: string;
  profile_picture: string;
  likes?: number;
};

type Post = {
  post_id?: number;
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

  if (loading && posts.length === 0) return <p>Loading posts...</p>;
  if (error && posts.length === 0) return <p>Error: {error}</p>;
  if (posts.length === 0 && !loading) return <p>No posts found</p>;

  return (
    <>
      <div className="posts">
        <div className="filter-container">
          <img src="../icons/filter-icon.svg" alt="" />
          <p>Filter</p>
        </div>
        {posts.map((post) => {
          // Find the most liked comment
          const mostLikedComment =
            post.comments.length > 0
              ? [...post.comments].sort(
                  (a, b) => (b.likes || 0) - (a.likes || 0)
                )[0]
              : null;
          // All other comments except the most liked
          const otherComments =
            post.comments.length > 1
              ? [...post.comments]
                  .sort((a, b) => (b.likes || 0) - (a.likes || 0))
                  .slice(1)
              : [];
          const postId = post.post_id!;
          const commentCount = post.comments.length;

          return (
            <div key={postId} className="post">
              <div>
                <Link
                  href={`/users/${post.creatorUsername}`}
                  className="post-author-link"
                >
                  <img
                    src={`${post.creatorProfilePicture}`}
                    alt="pfp"
                    className="post-pfp"
                  />
                  <div className="post-author-container">
                    <div className="upper">
                      <p className="post-author">@{post.creatorUsername}</p>
                      <p className="date">
                        {new Date(post.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short", // 'short' gives abbreviated month names like "Mar"
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
              <div className="post-tags">
                {/* {post[3].map((tag, index) => (
                  <p key={index} className="post-tag">
                    {tag}
                  </p>
                ))} */}
              </div>
              {post.image && post.image !== "null" && post.image !== "" && (
                <img
                  src={post.image}
                  className="post-image post-image-clickable"
                  alt="Post"
                  onClick={() => setModalImage(post.image!)}
                />
              )}
              <div className="post-stats-container">
                <div className="like-container">
                  <img
                    src="../icons/heart-icon.svg"
                    alt=""
                    className={`heart-icon icon post-like-icon${
                      getCurrentUser() ? " clickable" : " not-allowed"
                    }${likeLoading[postId] ? " loading" : ""}`}
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
                </div>
                <div className="comments-stats-container">
                  <img
                    src="../icons/speech-bubble.png"
                    className="comment-icon icon post-comment-icon clickable"
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
              </div>
              {/* Most liked comment */}
              {mostLikedComment && (
                <div className="post-comment-container">
                  <Link
                    href={`/users/${mostLikedComment.username}`}
                    className="comment-author-link"
                  >
                    <img
                      src={`${serverAddress}${mostLikedComment.profile_picture}`}
                      alt="pfp"
                      className="comment-pfp"
                    />
                  </Link>
                  <div>
                    <Link
                      href={`/users/${mostLikedComment.username}`}
                      className="comment-author-link-text"
                    >
                      @{mostLikedComment.username}
                    </Link>
                    <span
                      className={`comment-likes${
                        getCurrentUser() ? " clickable" : " not-allowed"
                      }${
                        commentLikeLoading[mostLikedComment.comment_id]
                          ? " loading"
                          : ""
                      }`}
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
                    <div className="comment-content">
                      {mostLikedComment.comment_content}
                    </div>
                  </div>
                </div>
              )}
              {/* All comments (except most liked), toggled */}
              {openComments[postId] && otherComments.length > 0 && (
                <div className="post-comment-list">
                  {otherComments.map((comment, cidx) => (
                    <div
                      key={comment.comment_id}
                      className="post-comment-list-item"
                    >
                      <Link
                        href={`/users/${comment.username}`}
                        className="comment-author-link"
                      >
                        <img
                          src={`${comment.profile_picture}`}
                          alt="pfp"
                          className="comment-pfp-sm"
                        />
                      </Link>
                      <div>
                        <Link
                          href={`/users/${comment.username}`}
                          className="comment-author-link-text"
                        >
                          @{comment.username}
                        </Link>
                        <span
                          className={`comment-likes${
                            getCurrentUser() ? " clickable" : " not-allowed"
                          }${
                            commentLikeLoading[comment.comment_id]
                              ? " loading"
                              : ""
                          }`}
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
                        <div className="comment-content">
                          {comment.comment_content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Comment input */}
              {getCurrentUser() && (
                <form
                  className="comment-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const user = getCurrentUser();
                    if (!user) return;
                    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
                    setCommentError((prev) => ({ ...prev, [postId]: "" }));
                    try {
                      const res = await fetch(
                        `${serverAddress}/posts/${postId}/comments`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${user.token}`,
                          },
                          body: JSON.stringify({
                            comment_content: commentInputs[postId] || "",
                          }),
                        }
                      );
                      if (!res.ok) {
                        const err = await res.json();
                        if (err.muted) {
                          setCommentError((prev) => ({
                            ...prev,
                            [postId]:
                              err.error +
                              (err.retryAfter
                                ? ` Try again in ${err.retryAfter} seconds.`
                                : ""),
                          }));
                        } else {
                          setCommentError((prev) => ({
                            ...prev,
                            [postId]: err.error || "Failed to add comment",
                          }));
                        }
                      } else {
                        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
                        await refreshComments(postId);
                      }
                    } catch {
                      setCommentError((prev) => ({
                        ...prev,
                        [postId]: "Failed to add comment",
                      }));
                    } finally {
                      setCommentLoading((prev) => ({
                        ...prev,
                        [postId]: false,
                      }));
                    }
                  }}
                >
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentInputs[postId] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [postId]: e.target.value,
                      }))
                    }
                    className="comment-input"
                    maxLength={500}
                    disabled={commentLoading[postId]}
                  />
                  <button
                    type="submit"
                    className="comment-send-btn"
                    disabled={
                      commentLoading[postId] ||
                      !(commentInputs[postId] && commentInputs[postId].trim())
                    }
                  >
                    {commentLoading[postId] ? "..." : "Send"}
                  </button>
                </form>
              )}
              {commentError[postId] && (
                <div className="comment-error">{commentError[postId]}</div>
              )}
            </div>
          );
        })}
      </div>
      {modalImage && (
        <div className="image-modal" onClick={() => setModalImage(null)}>
          <div className="image-modal-inner">
            <img
              src={modalImage}
              alt="Full"
              className="image-modal-img"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={modalImage}
              download
              className="image-modal-download"
              onClick={(e) => e.stopPropagation()}
              title="Download image"
            >
              <img
                src="/icons/download_icon.png"
                alt="Download"
                className="download-icon-img"
              />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
