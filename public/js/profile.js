server_adress = "https://technigram.onrender.com  ";

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
        profilePicture: sztring,
        userId: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(`Error: ${errorData.message}`);
      return;
    }
  } catch (error) {
    console.error("Error changing profile picture:", error);
    alert("Failed to change profile picture");
  }
}
async function handleChangeUsername(sztring) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser")); // Parse the JSON object
  const token = currentUser?.token;
  const userId = currentUser?.id;

  if (!token) {
    alert("You are not authorized. Please log in first.");
    return;
  }
  try {
    const response = await fetch(`${server_adress}/changeUsername`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Attach the token in the Authorization header
      },
      body: JSON.stringify({
        username: sztring,
        userId: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      alert(`Error: ${errorData.message}`);
      return;
    }
  } catch (error) {
    console.error("Error changing username:", error);
    alert("Failed to change username");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const profilePictureImg = document.querySelector("#profilePicture");
  const usernameDisplay = document.querySelector(".username");
  const usernameForm = document.querySelector(".username-form");
  const usernameInput = document.querySelector(".username-input");

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

    if (usernameDisplay) {
      usernameDisplay.textContent = currentUserName;
    }
  } catch (error) {
    console.error("Error initializing home page:", error);
    window.location.replace("./login.html");
  }

  //  changing img pic
  try {
    const response = await fetch(
      `${server_adress}/profilePicture/${currentUserId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    const profilePicture = data.userProfilePicture;
    console.log(data);
    console.log(profilePicture);

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
  profilePictureImg.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const [maxW, maxH] = [560, 280];
          let [w, h] = [img.width, img.height];
          if (w > maxW || h > maxH)
            [w, h] = w > h ? [maxW, (h * maxW) / w] : [(w * maxH) / h, maxH];
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          handleChangeProfilePicture(
            canvas.toDataURL("image/jpeg", 0.2).split(",")[1]
          );
        };
        img.src = convertToImage(
          canvas.toDataURL("image/jpeg", 0.2).split(",")[1]
        );
      };
      reader.readAsDataURL(file);
    }
  });
  usernameDisplay.addEventListener("click", () => {
    usernameForm.style = "display: block;";
    usernameDisplay.style = "display: none;";
    usernameInput.value = usernameDisplay.innerText;
  });
  usernameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newUsername = usernameInput.value.trim();
    handleChangeUsername(newUsername);
    usernameDisplay.innerText = newUsername;
    usernameForm.style = "display: none;";
    usernameDisplay.style = "display: block;";
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("currentUser")),
        username: newUsername,
      })
    );
  });
});
