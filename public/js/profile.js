server_adress = "https://technigram.onrender.com";

function convertToImage(base64String1) {
  const base64String = base64String1;
  const output = document.getElementById("output");
  if (base64String) {
    let imgSrc = base64String;

    if (!imgSrc.startsWith("data:image")) {
      imgSrc = "data:image/png;base64," + imgSrc;
    }

    return imgSrc;
  } else {
    output.innerHTML = "Please enter a valid Base64 string.";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  let currentUserId;
  let currentUserName;

  try {
    const currentUserData = localStorage.getItem("currentUser");

    if (!currentUserData) {
      throw new Error("User not logged in");
    }

    const currentUser = JSON.parse(currentUserData);
    currentUserId = currentUser.id;
    currentUserName = currentUser.username;

    const usernameDisplay = document.querySelector(".username");
    if (usernameDisplay) {
      usernameDisplay.textContent = currentUserName;
    }
  } catch (error) {
    console.error("Error initializing home page:", error);
    window.location.replace("./login.html");
  }

  //  changing img pic
  const profilePictureImg = document.querySelector("#profilePicture");
  try {
    const response = await fetch(
      `${server_adress}/profilePicture/${currentUserId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const profilePicture = data.userProfilePicture;

    if (profilePicture) {
      if (profilePictureImg) {
        profilePictureImg.src = convertToImage(profilePicture);
      } else {
        const newImg = document.createElement("img");
        newImg.src = profilePicture;
        newImg.alt = "profile picture";
        profilePictureContainer.appendChild(newImg);
      }
    } else {
      if (profilePictureImg) {
        profilePictureImg.src = "/default-profile.png";
      } else {
        const newImg = document.createElement("img");
        newImg.src = "/default-profile.png";
        newImg.alt = "default profile picture";
        profilePictureContainer.appendChild(newImg);
      }
    }
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    if (profilePictureImg) {
      profilePictureImg.src = "/default-profile.png";
    } else {
      const newImg = document.createElement("img");
      newImg.src = "/default-profile.png";
      newImg.alt = "default profile picture";
      profilePictureContainer.appendChild(newImg);
    }
  }

  // Changing profile
  const fileInput = document.getElementById("fileInput");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const desiredWidth = 200; // Desired width of the cropped image
  const desiredHeight = 200; // Desired height of the cropped image

  profilePictureImg.addEventListener("click", function (event) {
    fileInput.click();
  });
  fileInput.addEventListener("change", function () {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = function (e) {
        profilePictureImg.src = e.target.result;
      };

      reader.readAsDataURL(file);
    }
  });
});
