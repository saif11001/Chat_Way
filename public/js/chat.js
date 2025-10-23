document.addEventListener('DOMContentLoaded', function() {
  console.log("Checking authentication...");

  const userData = window.USER_DATA;

  if (!userData || !userData.token || !userData.id) {
    console.error("No user data found!");
    alert("You are not logged in!");
    window.location.href = "/auth/login";
    return;
  }

  const token = userData.token;
  const decodedUserId = userData.id;

  console.log("Logged in as user:", decodedUserId);

  const socket = io({
    auth: { token }
  });

  const chatCircle = document.getElementById("chatCircle");
  const supportBox = document.getElementById("supportBox");
  const closeBtn = document.getElementById("closeBtn");
  const form = document.getElementById("form");
  const input = document.getElementById("input");
  const messages = document.getElementById("messages");
  const typingStatus = document.getElementById("typing_status");
  const logoutBtn = document.getElementById("logoutBtn");

  chatCircle.addEventListener("click", () => {
    console.log("Opening chat...");
    chatCircle.classList.add("hide");
    supportBox.classList.add("show");
  });

  closeBtn.addEventListener("click", () => {
    console.log("Closing chat...");
    supportBox.classList.remove("show");
    chatCircle.classList.remove("hide");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    console.log("Sending message:", text);
    socket.emit("chat message", text);
    input.value = "";
  });

  function renderMessage(data) {
    const item = document.createElement("div");
    item.classList.add("message");

    if (data.senderType === 'user' && String(data.senderId) === String(decodedUserId)) {
      item.classList.add("my-message");
    } else {
      item.classList.add("other-message");
    }

    const text = document.createElement("p");
    text.textContent = data.content;
    text.style.margin = "0";

    const time = document.createElement("span");
    time.textContent = new Date(data.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    time.classList.add("timestamp");

    item.appendChild(text);
    item.appendChild(time);
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
  }

  socket.on("chat message", (data) => {
    console.log("Received message:", data);
    renderMessage(data);
  });

  socket.on("loadMessages", (previousMessages) => {
    console.log("Loading", previousMessages.length, "previous messages");
    messages.innerHTML = "";
    previousMessages.forEach(renderMessage);
  });

  let typingTimeout;
  input.addEventListener("input", () => {
    socket.emit("typing");
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stop_typing");
    }, 1000);
  });

  socket.on("show_typing_status", () => {
    typingStatus.innerHTML = "Admin is typing...";
    typingStatus.classList.add("show");
  });

  socket.on("clear_typing_status", () => {
    setTimeout(() => {
      typingStatus.classList.remove("show");
      typingStatus.innerHTML = "";
    }, 1000);
  });

  logoutBtn.addEventListener("click", async () => {
    console.log("Logging out...");
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    window.location.href = "/auth/login";
  });

  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });

  socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
  });
});