"use client";

import "./changelog.css";
import { useState } from "react";
import Header from "@/components/header/header";

export default function Home() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const changelog_arr = [
    // walne tu pewnie display grida bo spodobał mi się pomysł
    [
      "Username Change",
      "Now you can go into /profile, click your username and change it",
    ],
    [
      "Pfp Change",
      "Now you can go into /profile, click your profile image and change it",
    ],
    [
      "Changelog Added",
      "Added changelog page to display updates and changes (you are in it)",
    ],
    [
      "Discord Server",
      "Na discordzie macie pingi do updates, info itp, also moje yappowanie do dev loga https://discord.gg/v7ZKFdyUjC> https://discord.gg/v7ZKFdyUjC",
    ],
  ];

  return (
    <div className="changelog container">
      <div
        className={`previous-changes changelog-container ${
          isCollapsed ? "collapsed" : ""
        }`}
      >
        <div className="changelog-header">
          <h1>Previous Changes</h1>
          <button onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        {changelog_arr.map((post, index) => (
          <details key={post}>
            <summary>{changelog_arr[index][0]}</summary>
            <div className="details-container">
              <p>{changelog_arr[index][1]}</p>
            </div>
          </details>
          // <div key={index} className="change">
          //     <p>{post[0]}</p>
          //     <p>Status: {post[1]}</p>
          //     <p>{post[2]}</p>
          //   </div>
        ))}
      </div>
    </div>
  );
}
