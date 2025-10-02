const socket = io();

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const typing_status = document.getElementById('typing_status');

// Ask for username
const username = prompt("Enter your username:") || "Anonymous";
socket.emit('set_username', username);

// Send message
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('message', { user: username, text: input.value });
    input.value = '';
  }
});

// Receive messages
socket.on('send_messages_to_all_users', (data) => {
  const item = document.createElement('li');
  const isMyMsg = data.senderId === socket.id;

  item.className = isMyMsg ? "my-message" : "other-message";
  item.innerHTML = `
    <span class="username">${data.user}</span>
    <div class="message-text">${data.text}</div>
    <span class="time">${data.time}</span>
  `;

  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight;
});

// Typing events
input.addEventListener('keydown', () => {
  socket.emit('typing');
});

socket.on('show_typing_status', (username) => {
  typing_status.innerHTML = `${username} is typing...`;
});

input.addEventListener('keyup', () => {
  socket.emit('stop_typing');
});

socket.on('clear_typing_status', () => {
  setTimeout(() => {
    typing_status.innerHTML= '';
  }, 2000);
})

// System messages
socket.on('user_joined', (msg) => {
  const item = document.createElement('li');
  item.classList.add('system-message');
  item.textContent = msg;
  messages.appendChild(item);
});

socket.on('user_left', (msg) => {
  const item = document.createElement('li');
  item.classList.add('system-message');
  item.textContent = msg;
  messages.appendChild(item);
});
