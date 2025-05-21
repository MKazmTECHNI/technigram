"use client";

import "./styles.css";
import React, { useEffect, useState, useRef } from "react";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

type Comment = {
  comment_content: string;
  username: string;
  profile_picture: string;
};

type Post = {
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

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchPosts() {
      console.log(serverAddress);
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
            console.log(post);
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
        {posts.map((post, index) => (
          <div key={index} className="post">
            <div>
              <img
                src={post.creatorProfilePicture}
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
              />
              <p className="post-likes">{post.likes}</p>
              <img
                src="../icons/speech-bubble.png"
                className="comment-icon icon"
              />
              {/* <p className="post-likes post-comments">{}</p> */}
            </div>
            <div className="post-comment-container"></div>
          </div>
        ))}
      </div>
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
    </>
  );
}
