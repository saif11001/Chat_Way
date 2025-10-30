document.addEventListener('DOMContentLoaded', function() {
  console.log("Admin panel loading...");

  const adminData = window.ADMIN_DATA;

  console.log("Admin Data:", adminData);

  if (!adminData) {
    console.error("No ADMIN_DATA found in window object!");
    alert("Unauthorized access: No admin data found!");
    window.location.href = "/auth/login";
    return;
  }

  if (!adminData.token) {
    console.error("No token found in ADMIN_DATA!");
    alert("Unauthorized access: No token found!");
    window.location.href = "/auth/login";
    return;
  }

  if (!adminData.id) {
    console.error("No admin ID found in ADMIN_DATA!");
    alert("Unauthorized access: No admin ID found!");
    window.location.href = "/auth/login";
    return;
  }

  const token = adminData.token;
  const adminId = adminData.id;

  console.log("Admin logged in:", adminId);
  console.log("Token length:", token.length);

  const socket = io({
    auth: { token }
  });

  socket.emit('join_as_admin');

  const userList = document.getElementById('userList');
  const messagesContainer = document.getElementById('messagesContainer');
  const chatHeader = document.getElementById('chatHeader');
  const chatInputContainer = document.getElementById('chatInputContainer');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');

  let currentUserId = null;
  let currentUserName = null;

  function toggleSidebar() {
    sidebar.classList.toggle('show-mobile');
    sidebarOverlay.classList.toggle('show');
  }

  function closeSidebar() {
    sidebar.classList.remove('show-mobile');
    sidebarOverlay.classList.remove('show');
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  async function loadActiveChats() {
    try {
      const res = await fetch('/admin/api/chats', {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.status === 'success') {
        displayUserList(data.data);
      }
    } catch (err) {
      console.error("Error loading chats:", err);
      userList.innerHTML = '<p class="loading">Error loading chats</p>';
    }
  }

  function displayUserList(chats) {
    if (chats.length === 0) {
      userList.innerHTML = '<p class="loading">No active chats yet</p>';
      return;
    }

    userList.innerHTML = chats.map(chat => `
      <div class="user-item" data-user-id="${chat.userId}" data-user-name="${chat.userName}">
        <div class="user-item-header">
          <span class="user-name">${chat.userName}</span>
          ${chat.unreadCount > 0 ? `<span class="message-count">${chat.unreadCount}</span>` : ''}
        </div>
        <div class="user-email">${chat.userEmail}</div>
        <div class="last-message">${chat.lastMessage}</div>
      </div>
    `).join('');

    document.querySelectorAll('.user-item').forEach(item => {
      item.addEventListener('click', function() {
        const userId = this.dataset.userId;
        const userName = this.dataset.userName;
        selectUser(userId, userName, this);
      });
    });
  }

  async function selectUser(userId, userName, element) {
    currentUserId = userId;
    currentUserName = userName;

    console.log(`Selected user ${userId} (${userName})`);

    document.querySelectorAll('.user-item').forEach(item => {
      item.classList.remove('active');
    });
    element.classList.add('active');

    chatHeader.innerHTML = `
      <div class="user-info">
        <div class="avatar">👤</div>
        <div class="details">
          <h3>${userName}</h3>
          <p>User ID: ${userId}</p>
        </div>
      </div>
    `;

    chatInputContainer.style.display = 'block';

    await loadUserMessages(userId);

    const badge = element.querySelector('.message-count');
    if (badge) {
      badge.remove();
    }

    try {
      await fetch(`/admin/api/messages/mark-read/${userId}`, {
        method: 'POST',
        credentials: 'include'
      });
      console.log(`Messages for user ${userId} marked as read`);
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }

    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  }

  async function loadUserMessages(userId) {
    try {
      const res = await fetch(`/admin/api/messages/${userId}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.status === 'success') {
        displayMessages(data.data);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      messagesContainer.innerHTML = '<p class="loading">Error loading messages</p>';
    }
  }

  function displayMessages(messages) {
    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
      messagesContainer.innerHTML = '<p class="loading">No messages yet</p>';
      return;
    }

    messages.forEach(msg => {
      renderMessage(msg);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function renderMessage(msg) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    
    if (msg.senderType === 'admin') {
      messageDiv.classList.add('admin-message');
    } else {
      messageDiv.classList.add('user-message');
    }

    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    messageDiv.innerHTML = `
      <p>${msg.content}</p>
      <span class="timestamp">${time}</span>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!currentUserId) {
      alert('Please select a user first!');
      return;
    }

    const text = messageInput.value.trim();
    if (!text) return;

    console.log(`Sending message to user ${currentUserId}:`, text);

    socket.emit('admin_message', {
      clientId: currentUserId,
      text: text
    });

    messageInput.value = '';
  });

  socket.on('admin_message_sent', (data) => {
    console.log("Admin message confirmed:", data);
    
    if (currentUserId && String(data.roomId) === String(currentUserId)) {
      renderMessage({
        content: data.content,
        senderType: 'admin',
        createdAt: data.createdAt
      });
    }
  });

  socket.on('new_user_message', (data) => {
    console.log("New user message:", data);
    
    loadActiveChats();

    if (currentUserId && String(data.roomId) === String(currentUserId)) {
      renderMessage({
        content: data.content,
        senderType: 'user',
        createdAt: data.createdAt
      });

      fetch(`/admin/api/messages/mark-read/${data.roomId}`, {
        method: 'POST',
        credentials: 'include'
      }).catch(err => console.error("Error marking new message as read:", err));
    }
  });

  socket.on('message_error', (error) => {
    console.error("Message error:", error);
    alert(`Failed to send message: ${error.error}`);
  });

  refreshBtn.addEventListener('click', () => {
    console.log("Refreshing chats...");
    loadActiveChats();
  });

  logoutBtn.addEventListener('click', async () => {
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

  socket.on('connect', () => {
    console.log("Admin connected to server - Socket ID:", socket.id);
    loadActiveChats();
  });

  socket.on('disconnect', () => {
    console.log("Disconnected from server");
  });

  socket.on('connect_error', (err) => {
    console.error("Connection error:", err.message);
    alert("Connection error! Please refresh the page.");
  });
});