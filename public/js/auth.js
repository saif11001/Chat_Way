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

// البدء بعرض صفحة Login
if (loginForm && registerForm) {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
}

// التبديل بين Login و Register
goLogin?.addEventListener("click", () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  messageBox.style.display = "none";
});

goRegister?.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  messageBox.style.display = "none";
});

// ===== REGISTER =====
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();

  if (!name || !email || !password) {
    return showMessage("All fields are required!", "error");
  }

  console.log("📝 Attempting registration...");

  try {
    const res = await fetch("/auth/register", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      credentials: 'include',
      body: JSON.stringify({ name, email, password })
    });

    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("Response data:", data);

    if (res.ok && data.status === 'success') {
      showMessage("Registration successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/';
      }, 500);
    } else {
      showMessage(data.message || "Registration failed", "error");
    }

  } catch (err) {
    console.error("❌ Registration error:", err);
    showMessage("Network error. Please try again.", "error");
  }
});

// ===== LOGIN =====
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    return showMessage("Please enter your email and password.", "error");
  }

  console.log("🔐 Attempting login for:", email);

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    console.log("Response status:", res.status);

    const data = await res.json();
    console.log("Response data:", data);

    if (res.ok && data.status === 'success') {
      showMessage("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/';
      }, 500);
    } else {
      showMessage(data.message || "Login failed", "error");
    }

  } catch (err) {
    console.error("❌ Login error:", err);
    showMessage("Network error. Please try again.", "error");
  }
});