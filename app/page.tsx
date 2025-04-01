"use client";

import "./styles.css";
import { useEffect, useState } from "react";

// const serverAddress = process.env.SERVER_ADDRESS;
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
  comments: Comment[];
};

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
    <div className="posts">
      <div className="filter-container">
        <img src="../icons/filter-icon.svg" alt="" />
        <p>Filter</p>
      </div>
      {posts.map((post, index) => (
        <div key={index} className="post">
          <div>
            <img
              src={"data:image/png;base64," + post.creatorProfilePicture}
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
          {/* <img src={post[6] === "" ? "null" : post[6]} className="post-image" /> */}
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
  );
}
