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

async function handleChangeProfilePicture(sztring) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser")); // Parse the JSON object
  const token = currentUser?.token;
  const userId = currentUser?.id;

  if (!token) {
    alert("You are not authorized. Please log in first.");
    return;
  }
  try {
    const response = await fetch(`${server_adress}/changeProfile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Attach the token in the Authorization header
      },
      body: JSON.stringify({
        profilePicBase64String: sztring,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(`Error: ${errorData.message}`);
      return;
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Failed to add comment");
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

  profilePictureImg.addEventListener("click", fileInput.click());
  fileInput.addEventListener("change", function () {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const [maxW, maxH] = [280, 140];
          let [w, h] = [img.width, img.height];
          if (w > maxW || h > maxH)
            [w, h] = w > h ? [maxW, (h * maxW) / w] : [(w * maxH) / h, maxH];
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          convertToImage(canvas.toDataURL("image/jpeg", 0.2).split(",")[1]);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  });
});
