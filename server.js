import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from client build in production
app.use(express.static(path.join(__dirname, 'client/dist')));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Rooms in memory
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join_room', ({ roomId, username }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      // Initialize room with default video
      rooms[roomId] = {
        roomId,
        users: [],
        currentVideo: {
          id: 'sintel',
          title: 'Sintel',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
          description: 'A beautiful open-source film by the Blender Foundation. Sintel is a young woman who searches for a baby dragon.',
          thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60'
        },
        playback: {
          isPlaying: false,
          currentTime: 0,
          lastUpdated: Date.now()
        },
        messages: []
      };
    }
    
    const room = rooms[roomId];
    
    // Check if user was already in the room under a different socket ID (reconnection)
    const existingUserIndex = room.users.findIndex(u => u.username === username);
    let isReconnect = false;
    
    if (existingUserIndex !== -1) {
      room.users[existingUserIndex].id = socket.id;
      isReconnect = true;
    } else {
      if (!room.users.some(u => u.id === socket.id)) {
        room.users.push({ id: socket.id, username });
      }
    }
    
    // Send current state
    socket.emit('room_state', room);
    
    // Update users list for everyone in the room
    io.to(roomId).emit('users_update', room.users);
    
    // Broadcast user joined (only if they aren't reconnecting silently)
    if (!isReconnect) {
      socket.to(roomId).emit('user_joined', { id: socket.id, username, users: room.users });
      
      const systemMsg = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'System',
        text: `${username} joined the party!`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.messages.push(systemMsg);
      io.to(roomId).emit('receive_message', systemMsg);
    }
  });
  
  socket.on('send_message', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (room) {
      const msgObject = {
        id: Math.random().toString(36).substr(2, 9),
        sender: message.sender,
        text: message.text,
        timestamp: Date.now()
      };
      room.messages.push(msgObject);
      if (room.messages.length > 100) room.messages.shift();
      
      io.to(roomId).emit('receive_message', msgObject);
    }
  });

  socket.on('send_reaction', ({ roomId, reaction, username }) => {
    io.to(roomId).emit('receive_reaction', { reaction, username, id: Math.random().toString() });
  });

  socket.on('video_change', ({ roomId, video, username }) => {
    const room = rooms[roomId];
    if (room) {
      room.currentVideo = video;
      room.playback.currentTime = 0;
      room.playback.isPlaying = false;
      room.playback.lastUpdated = Date.now();
      
      io.to(roomId).emit('video_changed', video);
      
      const systemMsg = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'System',
        text: `${username} changed the movie to "${video.title}"`,
        timestamp: Date.now(),
        isSystem: true
      };
      room.messages.push(systemMsg);
      io.to(roomId).emit('receive_message', systemMsg);
    }
  });

  socket.on('media_play', ({ roomId, currentTime, username }) => {
    const room = rooms[roomId];
    if (room) {
      room.playback.isPlaying = true;
      room.playback.currentTime = currentTime;
      room.playback.lastUpdated = Date.now();
      
      socket.to(roomId).emit('media_played', { currentTime, username });
    }
  });

  socket.on('media_pause', ({ roomId, username }) => {
    const room = rooms[roomId];
    if (room) {
      room.playback.isPlaying = false;
      room.playback.lastUpdated = Date.now();
      
      socket.to(roomId).emit('media_paused', { username });
    }
  });

  socket.on('media_seek', ({ roomId, currentTime, username }) => {
    const room = rooms[roomId];
    if (room) {
      room.playback.currentTime = currentTime;
      room.playback.lastUpdated = Date.now();
      
      socket.to(roomId).emit('media_seeked', { currentTime, username });
    }
  });
  
  socket.on('sync_request', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      socket.emit('sync_response', room.playback);
    }
  });

  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      const index = room.users.findIndex(u => u.id === socket.id);
      if (index !== -1) {
        const username = room.users[index].username;
        
        // Wait 4 seconds to see if they reconnect
        setTimeout(() => {
          const activeRoom = rooms[roomId];
          if (!activeRoom) return;
          
          // Verify if they are still connected under any ID (or if they reconnected with a new ID)
          const currentConnection = activeRoom.users.find(u => u.username === username);
          
          // If no connection is found for this username, OR if it matches this disconnected socket.id, they left!
          if (!currentConnection || currentConnection.id === socket.id) {
            const cleanIndex = activeRoom.users.findIndex(u => u.username === username);
            if (cleanIndex !== -1) activeRoom.users.splice(cleanIndex, 1);
            
            io.to(roomId).emit('users_update', activeRoom.users);
            
            if (activeRoom.users.length === 0) {
              delete rooms[roomId];
            } else {
              io.to(roomId).emit('user_left', { id: socket.id, username });
              
              const systemMsg = {
                id: Math.random().toString(36).substr(2, 9),
                sender: 'System',
                text: `${username} left the party.`,
                timestamp: Date.now(),
                isSystem: true
              };
              activeRoom.messages.push(systemMsg);
              io.to(roomId).emit('receive_message', systemMsg);
            }
          }
        }, 4000);
      }
    });
  });
});

// Local file upload endpoint (saves file locally on host)
app.post('/api/upload', (req, res) => {
  const fileName = decodeURIComponent(req.headers['x-file-name'] || 'video.mp4');
  const filePath = path.join(__dirname, 'temp_video.mp4');
  
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);
  
  req.on('end', () => {
    res.json({ success: true, url: '/api/video', title: fileName });
  });
  
  req.on('error', (err) => {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  });
});

// Stream uploaded local file (supports range requests natively via res.sendFile)
app.get('/api/video', (req, res) => {
  const filePath = path.join(__dirname, 'temp_video.mp4');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('No video uploaded yet');
  }
  res.sendFile(filePath);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
