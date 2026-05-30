"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Posts from "../../../components/posts/posts";
import CropModal from "../../../components/crop-modal";
import "./user-profile.css";

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

type LinkItem = {
  label: string;
  url: string;
};

type UserProfile = {
  id: number;
  username: string;
  true_name?: string;
  profile_picture?: string;
  bio?: string;
  status?: string;
  banner?: string;
  links?: LinkItem[];
  permission?: string;
  created_at?: string;
};

const normalizeUrl = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

const rankLabels: Record<string, string> = {
  uczen: "Student",
  nauczyciel: "Teacher",
  admin: "Admin",
  dyrektor: "Principal",
};

const rankClasses: Record<string, string> = {
  uczen: "rank-student",
  nauczyciel: "rank-teacher",
  admin: "rank-admin",
  dyrektor: "rank-principal",
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
  const [likeLoading, setLikeLoading] = useState<{ [key: number]: boolean }>({});
  const [commentLikeLoading, setCommentLikeLoading] = useState<{ [key: number]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [key: number]: boolean }>({});
  const [commentError, setCommentError] = useState<{ [key: number]: string }>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<{ [key: number]: boolean }>({});
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editLinks, setEditLinks] = useState<LinkItem[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profilePicSrc, setProfilePicSrc] = useState("");
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [cropModalAspect, setCropModalAspect] = useState(1);
  const cropModalHandlerRef = useRef<((blob: Blob) => void) | null>(null);

  const getCurrentUser = () => currentUser;

  const refreshComments = async (postId: number) => {
    try {
      const response = await fetch(`${serverAddress}/posts/${postId}`);
      if (response.ok) {
        const data = await response.json();
        setPosts((prev) =>
          prev.map((p) => (p.post_id === postId ? { ...p, comments: data.comments || [] } : p))
        );
      }
    } catch {}
  };

  const handlePostLike = async (postId: number) => {
    const user = getCurrentUser();
    if (!user) return;
    const liked = posts.find((p) => p.post_id === postId)?.isLiked;
    setPosts((prev) =>
      prev.map((p) =>
        p.post_id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`${serverAddress}/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? { ...p, isLiked: liked, likes: liked ? p.likes + 1 : p.likes - 1 }
              : p
          )
        );
      } else {
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => (p.post_id === postId ? { ...p, likes: data.likes } : p))
        );
      }
    } finally {
      setLikeLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

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
                  : c
              ),
            }
          : p
      )
    );
    setCommentLikeLoading((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await fetch(`${serverAddress}/posts/comments/${commentId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` },
      });
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
    setMounted(true);
    const userData = localStorage.getItem("currentUser");
    const user = userData ? JSON.parse(userData) : null;
    setCurrentUser(user);

    async function fetchProfile() {
      try {
        const res = await fetch(`${serverAddress}/users/by-username/${username}`);
        if (!res.ok) { window.location.replace("/"); return; }
        const data = await res.json();
        setProfile(data);
        setProfilePicSrc(data.profile_picture);

        if (user && data.id) {
          try {
            const followRes = await fetch(
              `${serverAddress}/social/follow/${data.id}/status`,
              { headers: { Authorization: `Bearer ${user.token}` } }
            );
            if (followRes.ok) {
              const followData = await followRes.json();
              setIsFollowing(followData.following);
            }
          } catch {}

          try {
            const countRes = await fetch(`${serverAddress}/social/follow/${data.id}/count`);
            if (countRes.ok) {
              const countData = await countRes.json();
              setFollowerCount(countData.followers || 0);
              setFollowingCount(countData.following || 0);
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
  }, [username]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`${serverAddress}/social/follow/${profile.id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        setFollowerCount((prev) => (data.following ? prev + 1 : prev - 1));
      }
    } catch {}
    setFollowLoading(false);
  };

  const isOwnProfile = mounted && currentUser && profile && Number(currentUser.id) === profile.id;

  const showMsg = (msg: string) => {
    setProfileMsg(msg);
    setTimeout(() => setProfileMsg(""), 2500);
  };

  // --- Edit mode ---
  const enterEditMode = () => {
    setEditUsername(profile?.username || "");
    setEditBio(profile?.bio || "");
    setEditStatus(profile?.status || "");
    setEditLinks(profile?.links?.slice() || []);
    setNewLinkLabel("");
    setNewLinkUrl("");
    setEditMode(true);
  };

  const saveProfile = async () => {
    if (!currentUser) return;

    // Save username if changed
    if (editUsername !== profile?.username) {
      const userRes = await fetch(`${serverAddress}/users/changeUsername`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ username: editUsername }),
      });
      if (!userRes.ok) { showMsg("Failed to update username"); return; }
      const parsed = JSON.parse(localStorage.getItem("currentUser") || "{}");
      parsed.username = editUsername;
      localStorage.setItem("currentUser", JSON.stringify(parsed));
    }

    // Save bio, status, links
    const res = await fetch(`${serverAddress}/users/update-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser.token}` },
      body: JSON.stringify({ bio: editBio, status: editStatus, links: editLinks }),
    });
    if (res.ok) {
      setProfile((p) => p ? { ...p, username: editUsername, bio: editBio, status: editStatus, links: editLinks } : p);
      setEditMode(false);
      showMsg("Profile updated!");
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const addLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) return;
    setEditLinks((prev) => [...prev, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };
  const removeLink = (i: number) => {
    setEditLinks((prev) => prev.filter((_, idx) => idx !== i));
  };

  const uploadPicBlob = async (blob: Blob) => {
    if (!currentUser) return;
    const fd = new FormData();
    fd.append("profilePicture", blob, "profile.jpg");
    const res = await fetch(`${serverAddress}/profile/upload-picture`, {
      method: "POST", headers: { Authorization: `Bearer ${currentUser.token}` }, body: fd,
    });
    if (res.ok) { const data = await res.json(); setProfilePicSrc(data.filePath + "?t=" + Date.now()); showMsg("Profile picture updated!"); }
    setCropModalSrc(null);
    cropModalHandlerRef.current = null;
  };

  const uploadBannerBlob = async (blob: Blob) => {
    if (!currentUser) return;
    const fd = new FormData();
    fd.append("banner", blob, "banner.jpg");
    const res = await fetch(`${serverAddress}/profile/upload-banner`, {
      method: "POST", headers: { Authorization: `Bearer ${currentUser.token}` }, body: fd,
    });
    if (res.ok) { const data = await res.json(); setProfile((p) => p ? { ...p, banner: data.filePath + "?t=" + Date.now() } : p); showMsg("Banner updated!"); }
    setCropModalSrc(null);
    cropModalHandlerRef.current = null;
  };

  const handleFileSelect = (
    file: File,
    maxSize: number,
    aspect: number,
    onCropDone: (blob: Blob) => void,
  ) => {
    if (file.size > maxSize) {
      const mb = maxSize / (1024 * 1024);
      showMsg(`File too large. Max ${mb}MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropModalAspect(aspect);
      cropModalHandlerRef.current = onCropDone;
      setCropModalSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    handleFileSelect(file, 2 * 1024 * 1024, 1, uploadPicBlob);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    handleFileSelect(file, 4 * 1024 * 1024, 3, uploadBannerBlob);
  };

  if (loading) {
    return <div style={{ color: "#c6a4ff", textAlign: "center", marginTop: 40 }}>Loading profile...</div>;
  }
  if (!profile) return null;

  const rankKey = profile.permission || "";
  const rankLabel = rankLabels[rankKey] || (rankKey ? rankKey.charAt(0).toUpperCase() + rankKey.slice(1) : "");
  const rankClass = rankClasses[rankKey] || "rank-other";
  const links = editMode ? editLinks : (profile.links || []);

  return (
    <div className="profile-page">
      {/* Banner */}
      <div className="banner-wrap">
        {profile.banner ? (
          <img src={profile.banner} alt="Banner" className="banner-img" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1a1a2e, #16213e)" }} />
        )}
        <div className="banner-overlay" />
        {isOwnProfile && (
          <label className="banner-upload-label">
            Change Banner
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleBannerUpload} style={{ display: "none" }} />
          </label>
        )}
      </div>

      {/* Profile info */}
      <div className="profile-info-section">
        <div className="profile-info-top">
          <div className="profile-pic-section">
            <img
              src={profilePicSrc || `${serverAddress}/images/profiles/default-profile.png`}
              alt="Profile"
              className="profile-pic"
            />
            {isOwnProfile && (
              <label className="pic-upload-overlay">
                Change
                <input type="file" accept="image/jpeg,image/png" onChange={handlePicUpload} style={{ display: "none" }} />
              </label>
            )}
          </div>

          <div className="profile-info-right">
            <div className="profile-names">
              <span className="profile-truename">
                {profile.true_name}
                {rankLabel && <span className={`rank-badge ${rankClass}`}>{rankLabel}</span>}
              </span>
              <span className="profile-username">
                {editMode ? (
                  <span>
                    @<input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      maxLength={28}
                      minLength={3}
                      style={{
                        background: "#232323", border: "1px solid #c6a4ff", borderRadius: 6,
                        color: "#fff", padding: "2px 8px", fontSize: "0.95em", width: 160,
                      }}
                    />
                  </span>
                ) : (
                  <span>@{profile.username}</span>
                )}
                {editMode ? (
                  <span style={{ marginLeft: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      maxLength={100}
                      placeholder="Status"
                      style={{
                        background: "#232323", border: "1px solid #c6a4ff", borderRadius: 6,
                        color: "#fff", padding: "2px 8px", fontSize: "0.9em", width: 280,
                      }}
                    />
                  </span>
                ) : (
                  <span style={{ color: "#b074ff", fontStyle: "italic", marginLeft: 8, fontSize: "0.95em" }}>
                    · "{profile.status || ""}"
                  </span>
                )}
              </span>
            </div>

            <div className="profile-actions">
              {isOwnProfile && !editMode && (
                <button className="profile-edit-btn" onClick={enterEditMode}>Edit Profile</button>
              )}
              {isOwnProfile && editMode && (
                <div className="profile-actions">
                  <button className="profile-edit-btn" onClick={cancelEdit} style={{ borderColor: "#ff6c6c", color: "#ff6c6c" }}>Cancel</button>
                  <button className="profile-follow-btn following" onClick={saveProfile}>Save</button>
                </div>
              )}
              {mounted && currentUser && !isOwnProfile && (
                <button
                  className={`profile-follow-btn ${isFollowing ? "following" : "not-following"}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bio & details */}
        <div className="profile-meta">
          {editMode ? (
            <div className="inline-edit-wrap">
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Bio"
                style={{ width: "100%", background: "#232323", border: "1px solid #c6a4ff", borderRadius: 8, color: "#fff", padding: "8px 12px", fontSize: "1em", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
          ) : (
            <div className="profile-bio">
              {profile.bio}
            </div>
          )}

          <div className="profile-details">
            {profile.created_at && (
              <span className="profile-detail-item">
                📅 Joined {new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            )}
            {!editMode && links.map((link, i) => (
              <a key={i} href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="profile-link">
                🔗 {link.label}
              </a>
            ))}
          </div>

          {editMode && (
            <div className="inline-edit-wrap">
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {editLinks.map((link, i) => (
                  <div key={i} className="link-item">
                    {link.label} — {link.url}
                    <span className="remove-link" onClick={() => removeLink(i)}>✕</span>
                  </div>
                ))}
              </div>
              <div className="add-link-form">
                <input placeholder="Label" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)} maxLength={30} />
                <input placeholder="URL" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} />
                <button onClick={addLink}>Add</button>
              </div>
            </div>
          )}

          <div className="profile-follow-counts">
            <span><strong>{followingCount}</strong> Following</span>
            <span><strong>{followerCount}</strong> Followers</span>
          </div>
        </div>
      </div>

      <div className="profile-divider" />

      <div className="profile-posts">
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

      {profileMsg && <div className="profile-msg">{profileMsg}</div>}

      {cropModalSrc && (
        <CropModal
          imageSrc={cropModalSrc}
          aspect={cropModalAspect}
          onCrop={(blob) => cropModalHandlerRef.current?.(blob)}
          onCancel={() => { setCropModalSrc(null); cropModalHandlerRef.current = null; }}
        />
      )}
    </div>
  );
}