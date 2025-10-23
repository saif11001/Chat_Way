const { Server } = require('socket.io');
const Message = require('../models/message');
const jwt = require('jsonwebtoken');

module.exports = (server) => {
  const io = new Server(server, {
    connectionStateRecovery: {}
  });

  const clients = new Map();

  io.on('connection', async (socket) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.log("❌ No token provided");
        return socket.disconnect();
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
      const userId = decoded.id;
      const userRole = decoded.userRole;

      if (!userId) {
        console.log("❌ User not authenticated, disconnecting socket:", socket.id);
        return socket.disconnect();
      }

      // ============================================
      // Admin Connection
      // ============================================
      if (userRole === 'admin') {
        socket.join('admins');
        console.log(`✅ Admin ${userId} connected (${socket.id})`);
        console.log("📊 Connected users:", Array.from(clients.keys()));
        
        // Handle admin messages
        socket.on("admin_message", async ({ clientId, text }) => {
          console.log(`📨 Admin sending message to user ${clientId}: "${text}"`);

          const userRoom = `room_${clientId}`;
          
          try {
            const cleanText = text.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");
            
            // Save to database ONCE
            const newMessage = await Message.create({
              roomId: clientId,
              senderId: "admin",
              senderType: 'admin',
              content: cleanText
            });

            console.log(`✅ Admin message saved to DB with ID: ${newMessage.id}`);

            const messageData = {
              id: newMessage.id,
              content: newMessage.content,
              createdAt: newMessage.createdAt,
              senderId: "admin",
              senderType: 'admin'
            };

            // Send to user ONCE
            io.to(userRoom).emit('chat message', messageData);

            // Send confirmation to admin ONCE
            socket.emit('admin_message_sent', {
              ...messageData,
              roomId: clientId
            });

            console.log(`✅ Admin message sent to user ${clientId}`);

          } catch (e) {
            console.error("❌ Admin message error:", e);
            socket.emit('message_error', { 
              error: 'Failed to send message',
              details: e.message 
            });
          }
        });

        return; // IMPORTANT: Stop here for admins
      }

      // ============================================
      // Regular User Connection
      // ============================================
      const userRoom = `room_${userId}`;
      clients.set(userId, { socketId: socket.id, room: userRoom });
      socket.join(userRoom);

      console.log(`✅ User ${userId} connected to room: ${userRoom}`);
      console.log("📊 Total connected users:", clients.size);

      // Load previous messages
      const previousMessages = await Message.findAll({
        where: { roomId: userId },
        order: [['createdAt', 'ASC']]
      });

      socket.emit('loadMessages', previousMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
        senderType: msg.senderType
      })));

      // Send welcome message only if this is first time
      if (previousMessages.length === 0) {
        const welcomeMessage = await Message.create({
          roomId: userId,
          senderId: "system",
          senderType: 'admin',
          content: '👋 Welcome! This is your private support chat.'
        });

        socket.emit('chat message', {
          id: welcomeMessage.id,
          content: welcomeMessage.content,
          createdAt: welcomeMessage.createdAt,
          senderId: "system",
          senderType: "admin"
        });
      }

      // User sends message
      socket.on('chat message', async (msg) => {
        if (!msg || msg.trim() === '') return;
        const cleanMsg = msg.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;");

        try {
          const newMessage = await Message.create({
            roomId: userId,
            senderId: userId,
            senderType: 'user',
            content: cleanMsg
          });

          // Send to user's own room
          io.to(userRoom).emit('chat message', {
            id: newMessage.id,
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            senderId: userId,
            senderType: 'user'
          });

          // Notify all admins
          io.to('admins').emit('new_user_message', {
            id: newMessage.id,
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            senderId: userId,
            senderType: 'user',
            roomId: userId
          });

          console.log(`💬 User ${userId} sent: ${cleanMsg}`);
        } catch (e) {
          console.error("❌ DB insert error:", e);
        }
      });

      // Typing indicators
      socket.on('typing', () => {
        io.to('admins').emit('show_typing_status', { userId });
      });

      socket.on('stop_typing', () => {
        io.to('admins').emit('clear_typing_status', { userId });
      });

      // User disconnect
      socket.on("disconnect", () => {
        console.log(`👋 User ${userId} disconnected`);
        clients.delete(userId);
        console.log("📊 Remaining users:", clients.size);
      });

    } catch (err) {
      console.error("❌ Socket connection error:", err);
      socket.disconnect();
    }
  });
};

