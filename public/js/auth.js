const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const goLogin = document.getElementById("goLogin");
const goRegister = document.getElementById("goRegister");
const messageBox = document.getElementById("messageBox");

function showMessage(text, type = "error") {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
  messageBox.style.display = "block";
  setTimeout(() => (messageBox.style.display = "none"), 4000);
}

if (loginForm && registerForm) {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
}

const params = new URLSearchParams(window.location.search);
const errorType = params.get("error");
if (errorType) {
  switch (errorType) {
    case "email_exists":
      showMessage("This E-mail is already registered. Please pick a different one.", "error");
      break;
    case "user_not_found":
      showMessage("No user found with this email.", "error");
      break;
    case "wrong_password":
      showMessage("Incorrect password. Please try again.", "error");
      break;
    case "server":
      showMessage("Server error. Please try again later.", "error");
      break;
  }
}

goLogin?.addEventListener("click", () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});

goRegister?.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  if (!name || !email || !password) {
    return showMessage("All fields are required!", "error");
  }

  try {
    const res = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });

    if (res.redirected) {
      console.log("Registration successful, redirecting...");
      return (window.location.href = res.url);
    }

    const data = await res.json();

    if (!res.ok) {
      const redirectError = data.message?.includes("exists")
        ? "email_exists"
        : "server";
      return (window.location.href = `/auth/register?error=${redirectError}`);
    }

    console.log("Registration successful!");
    window.location.href = "/";
  } catch (err) {
    console.error("Registration error:", err);
    showMessage("Error during registration", "error");
  }
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    return showMessage("Please enter your email and password.", "error");
  }

  console.log("Attempting login for:", email);

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    console.log("Response status:", res.status);
    console.log("Redirected:", res.redirected);

    if (res.redirected) {
      console.log("Login successful, redirecting to:", res.url);
      return (window.location.href = res.url);
    }

    const data = await res.json();

    if (!res.ok) {
      let errorType = "server";
      if (data.message?.includes("not found")) errorType = "user_not_found";
      else if (data.message?.includes("Incorrect")) errorType = "wrong_password";

      console.error("Login failed:", errorType);
      return (window.location.href = `/auth/login?error=${errorType}`);
    }

    console.log("Login successful!");
    window.location.href = "/";
  } catch (err) {
    console.error("Login error:", err);
    showMessage("Error during login", "error");
  }
});