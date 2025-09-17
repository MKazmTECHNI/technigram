import React, { useState } from "react";
import Link from "next/link";

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

interface PostsProps {
  posts: Post[];
  serverAddress?: string;
  likeLoading?: { [key: number]: boolean };
  commentLikeLoading?: { [key: number]: boolean };
  handlePostLike?: (postId: number) => void;
  handleCommentLike?: (commentId: number, postId: number) => void;
  getCurrentUser?: () => any;
  commentInputs?: { [key: number]: string };
  setCommentInputs?: React.Dispatch<
    React.SetStateAction<{ [key: number]: string }>
  >;
  commentLoading?: { [key: number]: boolean };
  commentError?: { [key: number]: string };
  setCommentLoading?: React.Dispatch<
    React.SetStateAction<{ [key: number]: boolean }>
  >;
  setCommentError?: React.Dispatch<
    React.SetStateAction<{ [key: number]: string }>
  >;
  refreshComments?: (postId: number) => Promise<void>;
}

export default function Posts({
  posts,
  serverAddress,
  likeLoading = {},
  commentLikeLoading = {},
  handlePostLike,
  handleCommentLike,
  getCurrentUser,
  commentInputs = {},
  setCommentInputs,
  commentLoading = {},
  commentError = {},
  setCommentLoading,
  setCommentError,
  refreshComments,
}: PostsProps) {
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  if (!posts || posts.length === 0) return <p>No posts found</p>;
  return (
    <div className="container posts">
      {posts.map((post) => {
        const postId = post.post_id!;
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
        const commentCount = post.comments.length;
        return (
          <div key={postId} className="post">
            <div style={{ display: "flex", alignItems: "center" }}>
              <Link
                href={`/users/${post.creatorUsername}`}
                style={{ textDecoration: "none" }}
              >
                <img
                  src={post.creatorProfilePicture}
                  alt="pfp"
                  className="post-pfp"
                  style={{ cursor: "pointer" }}
                />
              </Link>
              <div className="post-author-container">
                <div className="upper">
                  <Link
                    href={`/users/${post.creatorUsername}`}
                    style={{ textDecoration: "none" }}
                  >
                    <span
                      className="post-author"
                      style={{ color: "#c6a4ff", cursor: "pointer" }}
                    >
                      @{post.creatorUsername}
                    </span>
                  </Link>
                  <span className="date">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    })}
                  </span>
                </div>
                <span className="post-author-name">{post.trueName}</span>
              </div>
            </div>
            <p>{post.content}</p>
            {/* Tags rendering can be added here if needed */}
            {post.image && post.image !== "null" && post.image !== "" && (
              <img
                src={
                  post.image.startsWith("http")
                    ? post.image
                    : serverAddress
                    ? `${serverAddress}${post.image}`
                    : post.image
                }
                className="post-image"
                alt="Post"
              />
            )}
            <div className="post-stats-container">
              <img
                src="../icons/heart-icon.svg"
                alt=""
                className={`heart-icon icon${
                  getCurrentUser && getCurrentUser()
                    ? " clickable"
                    : " not-allowed"
                }${likeLoading[postId] ? " loading" : ""}`}
                style={{
                  cursor:
                    getCurrentUser && getCurrentUser() ? "pointer" : "default",
                }}
                onClick={() =>
                  getCurrentUser &&
                  getCurrentUser() &&
                  handlePostLike &&
                  !likeLoading[postId]
                    ? handlePostLike(postId)
                    : undefined
                }
                title={
                  getCurrentUser && getCurrentUser()
                    ? "Like/unlike post"
                    : "Login to like"
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
              <p className="post-likes">{commentCount}</p>
            </div>
            {/* Most liked comment */}
            {mostLikedComment && (
              <div className="post-comment-container">
                <Link
                  href={`/users/${mostLikedComment.username}`}
                  style={{ textDecoration: "none" }}
                >
                  <img
                    src={
                      serverAddress
                        ? `${serverAddress}${mostLikedComment.profile_picture}`
                        : mostLikedComment.profile_picture
                    }
                    alt="pfp"
                    className="comment-pfp"
                    style={{ cursor: "pointer" }}
                  />
                </Link>
                <Link
                  href={`/users/${mostLikedComment.username}`}
                  style={{ textDecoration: "none" }}
                >
                  <span
                    className="comment-author"
                    style={{ color: "#c6a4ff", cursor: "pointer" }}
                  >
                    @{mostLikedComment.username}
                  </span>
                </Link>
                <span
                  className={`comment-likes${
                    getCurrentUser && getCurrentUser()
                      ? " clickable"
                      : " not-allowed"
                  }${
                    commentLikeLoading[mostLikedComment.comment_id]
                      ? " loading"
                      : ""
                  }`}
                  style={{
                    cursor:
                      getCurrentUser && getCurrentUser()
                        ? "pointer"
                        : "default",
                  }}
                  onClick={() =>
                    getCurrentUser &&
                    getCurrentUser() &&
                    handleCommentLike &&
                    !commentLikeLoading[mostLikedComment.comment_id]
                      ? handleCommentLike(mostLikedComment.comment_id, postId)
                      : undefined
                  }
                  title={
                    getCurrentUser && getCurrentUser()
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
            )}
            {/* All comments (except most liked), toggled by bubble only */}
            {openComments[postId] && otherComments.length > 0 && (
              <div className="post-comment-list">
                {otherComments.map((comment) => (
                  <div
                    key={comment.comment_id}
                    className="post-comment-list-item"
                  >
                    <Link
                      href={`/users/${comment.username}`}
                      style={{ textDecoration: "none" }}
                    >
                      <img
                        src={
                          serverAddress
                            ? `${serverAddress}${comment.profile_picture}`
                            : comment.profile_picture
                        }
                        alt="pfp"
                        className="comment-pfp-sm"
                        style={{ cursor: "pointer" }}
                      />
                    </Link>
                    <Link
                      href={`/users/${comment.username}`}
                      style={{ textDecoration: "none" }}
                    >
                      <span
                        className="comment-author"
                        style={{ color: "#c6a4ff", cursor: "pointer" }}
                      >
                        @{comment.username}
                      </span>
                    </Link>
                    <span
                      className={`comment-likes${
                        getCurrentUser && getCurrentUser()
                          ? " clickable"
                          : " not-allowed"
                      }${
                        commentLikeLoading[comment.comment_id] ? " loading" : ""
                      }`}
                      style={{
                        cursor:
                          getCurrentUser && getCurrentUser()
                            ? "pointer"
                            : "default",
                      }}
                      onClick={() =>
                        getCurrentUser &&
                        getCurrentUser() &&
                        handleCommentLike &&
                        !commentLikeLoading[comment.comment_id]
                          ? handleCommentLike(comment.comment_id, postId)
                          : undefined
                      }
                      title={
                        getCurrentUser && getCurrentUser()
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
                ))}
              </div>
            )}
            {/* Comment input */}
            {getCurrentUser &&
              getCurrentUser() &&
              setCommentInputs &&
              setCommentLoading &&
              setCommentError &&
              refreshComments && (
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
  );
}
