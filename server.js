import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'streaam-secret-key-couples-2026';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from client build in production
app.use(express.static(path.join(__dirname, 'client/dist')));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Health & DB Connection Check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date() });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, passwordHash }
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, coupleId: user.coupleId },
      JWT_SECRET
    );

    res.json({ token, user: { id: user.id, email: user.email, username: user.username, coupleId: user.coupleId } });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: err.message || 'Failed to register user' });
  }
});

// Login existing user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { couple: { include: { users: true } } }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, coupleId: user.coupleId },
      JWT_SECRET
    );

    const partner = user.couple?.users.find(u => u.id !== user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        coupleId: user.coupleId,
        couple: user.couple ? { id: user.couple.id, inviteCode: user.couple.inviteCode } : null,
        partner: partner ? { id: partner.id, username: partner.username, email: partner.email } : null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { couple: { include: { users: true } } }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const partner = user.couple?.users.find(u => u.id !== user.id);

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      coupleId: user.coupleId,
      couple: user.couple ? { id: user.couple.id, inviteCode: user.couple.inviteCode } : null,
      partner: partner ? { id: partner.id, username: partner.username, email: partner.email } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create a new Couple Space
app.post('/api/auth/create-couple', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (user.coupleId) {
      return res.status(400).json({ error: 'User already belongs to a couple space' });
    }

    // Generate random 6-character uppercase invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const couple = await prisma.couple.create({
      data: {
        inviteCode,
        users: { connect: { id: user.id } }
      },
      include: { users: true }
    });

    // Update token payload
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, coupleId: couple.id },
      JWT_SECRET
    );

    res.json({ token, couple: { id: couple.id, inviteCode: couple.inviteCode } });
  } catch (err) {
    console.error('Create couple error:', err);
    res.status(500).json({ error: 'Failed to create couple space' });
  }
});

// Join an existing Couple Space using Invite Code
app.post('/api/auth/join-couple', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

    const couple = await prisma.couple.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
      include: { users: true }
    });

    if (!couple) {
      return res.status(404).json({ error: 'Invalid couple invite code' });
    }

    if (couple.users.length >= 2) {
      return res.status(400).json({ error: 'This couple space is already full (maximum 2 partners)' });
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { coupleId: couple.id }
    });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, coupleId: couple.id },
      JWT_SECRET
    );

    res.json({ token, couple: { id: couple.id, inviteCode: couple.inviteCode } });
  } catch (err) {
    console.error('Join couple error:', err);
    res.status(500).json({ error: 'Failed to join couple space' });
  }
});

// ==========================================
// PERSISTENT CHAT & WATCH SESSION ROUTES
// ==========================================

// Get Chat History with pagination
app.get('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { cursor, limit = 50 } = req.query;
    if (!req.user.coupleId) {
      return res.status(400).json({ error: 'User does not belong to a couple space' });
    }

    const take = parseInt(limit);
    const query = {
      where: { coupleId: req.user.coupleId },
      take: take,
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, username: true } } }
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const dbMessages = await prisma.message.findMany(query);
    
    // Transform to frontend message format in chronological order
    const formatted = dbMessages.reverse().map(m => ({
      id: m.id,
      sender: m.sender ? m.sender.username : 'System',
      senderId: m.senderId,
      text: m.text,
      isSystem: m.isSystem,
      timestamp: new Date(m.createdAt).getTime()
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Update playback progress for Continue Watching
app.post('/api/watch-session/progress', authenticateToken, async (req, res) => {
  try {
    const { sessionId, currentTime, duration, isCompleted } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const session = await prisma.watchSession.update({
      where: { id: sessionId },
      data: {
        lastPosition: currentTime,
        duration: duration || undefined,
        isCompleted: isCompleted || false
      }
    });

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watch session progress' });
  }
});

// ==========================================
// WATCHLIST, HISTORY, CONTINUE WATCHING & RATINGS
// ==========================================

// Get Watchlist
app.get('/api/watchlist', authenticateToken, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ error: 'No couple space' });
    const items = await prisma.watchlistItem.findMany({
      where: { coupleId: req.user.coupleId },
      orderBy: { createdAt: 'desc' },
      include: { addedBy: { select: { username: true } } }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Add to Watchlist
app.post('/api/watchlist', authenticateToken, async (req, res) => {
  try {
    const { title, posterUrl, imdbId, status = 'WANT_TO_WATCH' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const item = await prisma.watchlistItem.create({
      data: {
        coupleId: req.user.coupleId,
        addedById: req.user.userId,
        title,
        posterUrl,
        imdbId,
        status
      },
      include: { addedBy: { select: { username: true } } }
    });

    const couple = await prisma.couple.findUnique({ where: { id: req.user.coupleId } });
    if (couple && couple.inviteCode) {
      io.to(couple.inviteCode).emit('watchlist_updated', item);
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// Update Watchlist Item Status
app.patch('/api/watchlist/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const item = await prisma.watchlistItem.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watchlist item' });
  }
});

// Delete Watchlist Item
app.delete('/api/watchlist/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.watchlistItem.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete watchlist item' });
  }
});

// Get Watch History
app.get('/api/watch-history', authenticateToken, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ error: 'No couple space' });
    const history = await prisma.watchSession.findMany({
      where: { coupleId: req.user.coupleId },
      orderBy: { startedAt: 'desc' },
      include: { ratings: { include: { user: { select: { username: true } } } } }
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

// Get Continue Watching Sessions
app.get('/api/continue-watching', authenticateToken, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ error: 'No couple space' });
    const unfinished = await prisma.watchSession.findMany({
      where: {
        coupleId: req.user.coupleId,
        isCompleted: false,
        lastPosition: { gt: 10 } // Paused at least 10 seconds in
      },
      orderBy: { startedAt: 'desc' },
      take: 5
    });
    res.json(unfinished);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch continue watching sessions' });
  }
});

// Add Rating to Watch Session
app.post('/api/ratings', authenticateToken, async (req, res) => {
  try {
    const { watchSessionId, stars, review } = req.body;
    if (!watchSessionId || !stars) return res.status(400).json({ error: 'watchSessionId and stars required' });

    const rating = await prisma.rating.create({
      data: {
        watchSessionId,
        userId: req.user.userId,
        stars: parseInt(stars),
        review
      },
      include: { user: { select: { username: true } } }
    });

    res.json(rating);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// ==========================================
// PRIVATE MEMORIES ROUTES
// ==========================================

// Get Memories
app.get('/api/memories', authenticateToken, async (req, res) => {
  try {
    if (!req.user.coupleId) return res.status(400).json({ error: 'No couple space' });
    const memories = await prisma.memory.findMany({
      where: { coupleId: req.user.coupleId },
      orderBy: { memoryDate: 'desc' },
      include: { uploadedBy: { select: { username: true } } }
    });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// Create Memory
app.post('/api/memories', authenticateToken, async (req, res) => {
  try {
    const { mediaUrl, mediaType = 'IMAGE', caption, memoryDate } = req.body;
    if (!mediaUrl) return res.status(400).json({ error: 'Media URL is required' });

    const memory = await prisma.memory.create({
      data: {
        coupleId: req.user.coupleId,
        uploadedById: req.user.userId,
        mediaUrl,
        mediaType,
        caption,
        memoryDate: memoryDate ? new Date(memoryDate) : new Date()
      },
      include: { uploadedBy: { select: { username: true } } }
    });

    res.json(memory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save memory' });
  }
});



// Rooms in memory (Preserved for backwards-compatibility & Socket state)
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
  
  socket.on('send_message', async ({ roomId, message }) => {
    const room = rooms[roomId];
    if (room) {
      let savedMsg = null;
      try {
        const couple = await prisma.couple.findFirst({
          where: { inviteCode: roomId }
        });
        
        if (couple) {
          const user = await prisma.user.findFirst({
            where: { username: message.sender, coupleId: couple.id }
          });
          
          if (user) {
            savedMsg = await prisma.message.create({
              data: {
                coupleId: couple.id,
                senderId: user.id,
                text: message.text,
                isSystem: false
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to persist message to DB:', e);
      }

      const msgObject = {
        id: savedMsg ? savedMsg.id : Math.random().toString(36).substr(2, 9),
        sender: message.sender,
        text: message.text,
        timestamp: savedMsg ? new Date(savedMsg.createdAt).getTime() : Date.now()
      };
      room.messages.push(msgObject);
      if (room.messages.length > 100) room.messages.shift();
      
      io.to(roomId).emit('receive_message', msgObject);
    }
  });

  socket.on('send_reaction', ({ roomId, reaction, username }) => {
    io.to(roomId).emit('receive_reaction', { reaction, username, id: Math.random().toString() });
  });

  socket.on('send_flirt', ({ roomId, quote, sender }) => {
    io.to(roomId).emit('receive_flirt', { quote, sender });
  });

  socket.on('upload_progress', ({ roomId, username, percent, fileName }) => {
    socket.to(roomId).emit('partner_upload_progress', { username, percent, fileName });
  });

  socket.on('video_change', async ({ roomId, video, username }) => {
    const room = rooms[roomId];
    if (room) {
      room.currentVideo = video;
      room.playback.currentTime = 0;
      room.playback.isPlaying = false;
      room.playback.lastUpdated = Date.now();
      
      try {
        const couple = await prisma.couple.findFirst({ where: { inviteCode: roomId } });
        if (couple) {
          const session = await prisma.watchSession.create({
            data: {
              coupleId: couple.id,
              movieTitle: video.title || 'Untitled Stream',
              videoUrl: video.url || '',
              posterUrl: video.poster || video.thumbnail || '',
              sourceType: video.isLocalFile ? 'upload' : (video.isCustom ? 'custom' : 'catalog'),
              duration: 0
            }
          });
          room.activeSessionId = session.id;
        }
      } catch (err) {
        console.error('Failed to save watch session:', err);
      }

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
          
          const currentConnection = activeRoom.users.find(u => u.username === username);
          
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

// Local file upload endpoint
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

// Stream uploaded local file
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
