let currentUserId;
let currentUserName;

server_adress = "https://technigram.onrender.com";

// let loggedInAsMessage = document.querySelector(`.headline`);
// const loggedInAsMessage = document.querySelector("#currently-logged-user`);
// loggedInAsMessage.innerHTML = "yes";

function escapeHTML(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchPost(postId) {
  try {
    const response = await fetch(`${server_adress}/posts/${postId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const postDetails = await response.json();

    const mainElement = document.querySelector("main");
    const imgPath = baseToPath(postDetails.creatorProfilePicture);

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    let commentsHTML = "";
    postDetails.comments.forEach((comment) => {
      commentsHTML += `
        <p class="description">
          <span class="author">${escapeHTML(comment.username)}:</span>
          ${escapeHTML(comment.comment_content)}
        </p>
      `;
    });

    postDiv.innerHTML = `
      <div class="profile">
        <img src="${escapeHTML(
          postDetails.creatorProfilePicture
        )}" alt="" class="avatar medium" />
        <span class="author">${escapeHTML(postDetails.creatorUsername)}</span>
      </div>
      <div class="post-content">
        <h3 class="title">${escapeHTML(postDetails.title)}</h3>
        <div class="line"></div>
        <p>${escapeHTML(postDetails.content)}</p>
      </div>
      <footer>
        <div class="comments">
          <div class="comment-creator">
            <input type="text" placeholder="Napisz komentarz..." id="commentInput-${postId}" />
            <button onclick="handleAddComment(${postId})">Add Comment</button>
          </div>
          ${commentsHTML}
        </div>
      </footer>
    `;

    mainElement.appendChild(postDiv);
  } catch (error) {
    console.error("Error fetching post details:", error);
    const mainElement = document.querySelector("main");
    mainElement.innerHTML = "<h2>Error fetching post details.</h2>";
  }
}

async function handleAddComment(postId) {
  const commentInput = document.querySelector(`#commentInput-${postId}`);
  const commentContent = commentInput.value;

  if (!commentContent) {
    alert("Comment content cannot be empty");
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser")); // Parse the JSON object
  const token = currentUser?.token;

  if (!token) {
    alert("You are not authorized. Please log in first.");
    return;
  }

  try {
    const response = await fetch(`${server_adress}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Attach the token in the Authorization header
      },
      body: JSON.stringify({
        comment_content: commentContent,
        comment_creator_id: currentUser.id, // Use the ID from currentUser object
      }),
    });
    commentInput.value = "";

    if (!response.ok) {
      const errorData = await response.json();
      alert(`Error: ${errorData.message}`);
      return;
    }

    const newComment = await response.json();

    const commentsContainer = commentInput.closest(".comments");
    commentsContainer.insertAdjacentHTML(
      "beforeend",
      `
      <p class="description">
      <span class="author">${escapeHTML(newComment.username)}:</span>
      ${escapeHTML(newComment.comment_content)}
      </p>
    `
    );
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Failed to add comment");
  }
}

async function fetchNumberOfPosts() {
  try {
    const response = await fetch(`${server_adress}/posts/count`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.numberOfPosts;
  } catch (error) {
    console.error("Error fetching number of posts:", error);
    return 0;
  }
}

async function addComment(postId, commentContent) {
  try {
    const response = await fetch(`${server_adress}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ comment_content: commentContent }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const newComment = await response.json();
    console.log("Added new comment:", newComment);
  } catch (error) {
    console.error("Error adding comment:", error);
  }
}

function baseToPath(base64String) {
  if (base64String) {
    let imgSrc = base64String;
    if (!imgSrc.startsWith("data:image")) {
      imgSrc = "data:image/png;base64," + imgSrc;
    }
    return imgSrc;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const currentUserData = localStorage.getItem("currentUser");

    if (!currentUserData) {
      throw new Error("User not logged in");
    }

    const currentUser = JSON.parse(currentUserData);

    const currentUserId = currentUser.id;
    const currentUserName = currentUser.username;

    const usernameDisplay = document.querySelector("#username-display");
    if (usernameDisplay) {
      usernameDisplay.textContent = currentUserName;
    }

    const numberOfPosts = await fetchNumberOfPosts();
    for (let i = numberOfPosts; i >= 1; i--) {
      await fetchPost(i);
    }
  } catch (error) {
    console.error("Error initializing home page:", error);
    // window.location.replace("./login.html");
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// start //dev console module
// this is a dev console module

let devMode = true;
var changeDevConsoleMode = () => {
  devMode = document.getElementById("devConsoleInput").value;
};

// if (devMode === true) {
//   document.getElementById("devConsole").style.display(hidden);
// }

var element = document.getElementById("switchToggle");

console.log(element);

element.addEventListener("click", function (event) {
  console.log(event);

  if (event.target.checked) {
    console.log("Checked");
  } else {
    console.log("Not checked");
  }
});

// end // dev console module
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
