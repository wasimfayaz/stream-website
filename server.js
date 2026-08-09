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
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USER,
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASS
  }
});

const sendEmail = async (to, subject, text, html) => {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS;

  if (!user || !pass) {
    console.log('\n==================================================');
    console.log(`[MOCK EMAIL SANDBOX]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('==================================================\n');
    return { mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Streaam Theater" <${user}>`,
      to,
      subject,
      text,
      html
    });
    console.log('Real email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    console.error('Failed to send real email via Gmail SMTP:', err);
    console.log('\n==================================================');
    console.log(`[MOCK EMAIL SANDBOX FALLBACK]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('==================================================\n');
    return { mock: true, error: err.message };
  }
};

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

// Helper to resolve or auto-create room couple space in DB by roomId
async function getCoupleByRoomId(roomId) {
  if (!roomId) return null;
  const roomCode = String(roomId).trim();
  let couple = await prisma.couple.findFirst({
    where: { inviteCode: roomCode }
  });
  if (!couple) {
    couple = await prisma.couple.create({
      data: { inviteCode: roomCode }
    });
  }
  return couple;
}

// ==========================================
// PERSISTENT CHAT & WATCH SESSION ROUTES
// ==========================================

// Get Chat History
app.get('/api/chat', async (req, res) => {
  try {
    const roomId = req.query.roomId || req.headers['x-room-id'];
    if (!roomId) return res.json([]);
    const couple = await getCoupleByRoomId(roomId);
    if (!couple) return res.json([]);

    const dbMessages = await prisma.message.findMany({
      where: { coupleId: couple.id },
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    
    const formatted = dbMessages.reverse().map(m => ({
      id: m.id,
      sender: 'Partner',
      text: m.text,
      isSystem: m.isSystem,
      timestamp: new Date(m.createdAt).getTime()
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Chat history error:', err);
    res.json([]);
  }
});

// Update playback progress for Continue Watching
app.post('/api/watch-session/progress', async (req, res) => {
  try {
    const { sessionId, currentTime, duration, isCompleted } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const session = await prisma.watchSession.update({
      where: { id: sessionId },
      data: {
        lastPosition: currentTime,
        duration: duration || undefined,
        isCompleted: isCompleted || false
      },
      include: { couple: true }
    });

    if (session.couple?.inviteCode) {
      io.to(session.couple.inviteCode).emit('history_updated');
    }

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watch session progress' });
  }
});

// Get Watchlist
app.get('/api/watchlist', async (req, res) => {
  try {
    const roomId = req.query.roomId || req.headers['x-room-id'];
    if (!roomId) return res.json([]);
    const couple = await getCoupleByRoomId(roomId);
    if (!couple) return res.json([]);

    const items = await prisma.watchlistItem.findMany({
      where: { coupleId: couple.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Add to Watchlist
app.post('/api/watchlist', async (req, res) => {
  try {
    const { roomId, title, posterUrl, imdbId, status = 'WANT_TO_WATCH' } = req.body;
    const roomCode = roomId || req.headers['x-room-id'];
    if (!title || !roomCode) return res.status(400).json({ error: 'Title and roomId are required' });

    const couple = await getCoupleByRoomId(roomCode);
    const item = await prisma.watchlistItem.create({
      data: {
        coupleId: couple.id,
        title,
        posterUrl,
        imdbId,
        status
      }
    });

    io.to(roomCode).emit('watchlist_updated', item);
    res.json(item);
  } catch (err) {
    console.error('Failed to add to watchlist:', err);
    res.status(500).json({ error: 'Failed to add to watchlist', details: err.message });
  }
});

// Update Watchlist Item Status
app.patch('/api/watchlist/:id', async (req, res) => {
  try {
    const { status, roomId } = req.body;
    const item = await prisma.watchlistItem.update({
      where: { id: req.params.id },
      data: { status }
    });
    const roomCode = roomId || req.headers['x-room-id'];
    if (roomCode) io.to(roomCode).emit('watchlist_updated', item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watchlist item' });
  }
});

// Delete Watchlist Item
app.delete('/api/watchlist/:id', async (req, res) => {
  try {
    await prisma.watchlistItem.delete({ where: { id: req.params.id } });
    const roomCode = req.query.roomId || req.headers['x-room-id'];
    if (roomCode) io.to(roomCode).emit('watchlist_updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete watchlist item' });
  }
});

// Get Watch History
app.get('/api/watch-history', async (req, res) => {
  try {
    const roomId = req.query.roomId || req.headers['x-room-id'];
    if (!roomId) return res.json([]);
    const couple = await getCoupleByRoomId(roomId);
    if (!couple) return res.json([]);

    const history = await prisma.watchSession.findMany({
      where: { coupleId: couple.id },
      orderBy: { startedAt: 'desc' },
      include: { ratings: true }
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watch history' });
  }
});

// Get Continue Watching Sessions
app.get('/api/continue-watching', async (req, res) => {
  try {
    const roomId = req.query.roomId || req.headers['x-room-id'];
    if (!roomId) return res.json([]);
    const couple = await getCoupleByRoomId(roomId);
    if (!couple) return res.json([]);

    const unfinished = await prisma.watchSession.findMany({
      where: {
        coupleId: couple.id,
        isCompleted: false,
        lastPosition: { gt: 10 }
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
app.post('/api/ratings', async (req, res) => {
  try {
    const { watchSessionId, stars, review, roomId } = req.body;
    if (!watchSessionId || !stars) return res.status(400).json({ error: 'watchSessionId and stars required' });

    const rating = await prisma.rating.create({
      data: {
        watchSessionId,
        stars: parseInt(stars),
        review
      },
      include: { watchSession: { include: { couple: true } } }
    });

    const roomCode = roomId || rating.watchSession?.couple?.inviteCode;
    if (roomCode) io.to(roomCode).emit('history_updated');

    res.json(rating);
  } catch (err) {
    console.error('Rating save error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// Get Memories
app.get('/api/memories', async (req, res) => {
  try {
    const roomId = req.query.roomId || req.headers['x-room-id'];
    if (!roomId) return res.json([]);
    const couple = await getCoupleByRoomId(roomId);
    if (!couple) return res.json([]);

    const memories = await prisma.memory.findMany({
      where: { coupleId: couple.id },
      orderBy: { memoryDate: 'desc' }
    });
    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// Create Memory
app.post('/api/memories', async (req, res) => {
  try {
    const { roomId, mediaUrl, mediaType = 'IMAGE', caption, memoryDate } = req.body;
    const roomCode = roomId || req.headers['x-room-id'];
    if (!mediaUrl || !roomCode) return res.status(400).json({ error: 'Media URL and roomId are required' });

    const couple = await getCoupleByRoomId(roomCode);
    const memory = await prisma.memory.create({
      data: {
        coupleId: couple.id,
        mediaUrl,
        mediaType,
        caption,
        memoryDate: memoryDate ? new Date(memoryDate) : new Date()
      }
    });

    io.to(roomCode).emit('memories_updated', memory);
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
          io.to(roomId).emit('history_updated');
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
      
      socket.to(roomId).emit('media_played', { currentTime, username, serverTimestamp: Date.now() });
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
      
      socket.to(roomId).emit('media_seeked', { currentTime, username, serverTimestamp: Date.now() });
    }
  });
  
  socket.on('sync_request', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      socket.emit('sync_response', room.playback);
    }
  });

  socket.on('watchlist_update', ({ roomId }) => {
    socket.to(roomId).emit('watchlist_updated');
  });

  socket.on('memories_update', ({ roomId }) => {
    socket.to(roomId).emit('memories_updated');
  });

  socket.on('history_update', ({ roomId }) => {
    socket.to(roomId).emit('history_updated');
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

// Active upload metadata store for handling concurrent upload & streaming
let activeUpload = null;

// Local file upload endpoint with progressive byte tracking
app.post('/api/upload', (req, res) => {
  const fileName = decodeURIComponent(req.headers['x-file-name'] || 'video.mp4');
  const fileSize = parseInt(req.headers['x-file-size'] || '0', 10);
  const mimeType = req.headers['content-type'] || 'video/mp4';
  const filePath = path.join(__dirname, 'temp_video.mp4');

  activeUpload = {
    filePath,
    fileName,
    mimeType,
    totalSize: fileSize,
    uploadedBytes: 0,
    isUploading: true,
    startTime: Date.now()
  };

  const writeStream = fs.createWriteStream(filePath);

  req.on('data', (chunk) => {
    if (activeUpload) {
      activeUpload.uploadedBytes += chunk.length;
    }
  });

  req.pipe(writeStream);

  req.on('end', () => {
    if (activeUpload) {
      activeUpload.isUploading = false;
      if (!activeUpload.totalSize) {
        activeUpload.totalSize = activeUpload.uploadedBytes;
      }
    }
    res.json({ success: true, url: '/api/video', title: fileName });
  });

  req.on('error', (err) => {
    console.error('Upload error:', err);
    if (activeUpload) activeUpload.isUploading = false;
    res.status(500).json({ error: err.message });
  });
});

// Stream uploaded local file with full HTTP Byte-Range Requests support
app.get('/api/video', async (req, res) => {
  const filePath = path.join(__dirname, 'temp_video.mp4');

  // If file doesn't exist yet, wait up to 1.5s for upload request to initialize file
  let attempts = 0;
  while (!fs.existsSync(filePath) && activeUpload && activeUpload.isUploading && attempts < 15) {
    await new Promise(r => setTimeout(r, 100));
    attempts++;
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('No video uploaded yet');
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (err) {
    return res.status(404).send('Video file unreadable');
  }

  let currentSize = stat.size;
  // If 0 bytes written, wait up to 1.5s for initial data chunk
  attempts = 0;
  while (currentSize === 0 && activeUpload && activeUpload.isUploading && attempts < 15) {
    await new Promise(r => setTimeout(r, 100));
    try {
      currentSize = fs.statSync(filePath).size;
    } catch (e) {}
    attempts++;
  }

  if (currentSize === 0) {
    res.setHeader('Retry-After', '1');
    return res.status(503).send('Video buffer initializing...');
  }

  const totalSize = (activeUpload && activeUpload.totalSize > 0)
    ? activeUpload.totalSize
    : currentSize;

  const mimeType = (activeUpload && activeUpload.mimeType)
    ? activeUpload.mimeType
    : 'video/mp4';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');

  const range = req.headers.range;

  if (!range) {
    // Standard full stream
    res.writeHead(200, {
      'Content-Length': currentSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Parse HTTP Range header (e.g. "bytes=0-" or "bytes=1024-4096")
  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  let end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

  if (isNaN(start) || start < 0) {
    res.setHeader('Content-Range', `bytes */${totalSize}`);
    return res.status(416).send('Requested range not satisfiable');
  }

  // If requested start is past currently written disk bytes, wait up to 1.5s for bytes to arrive
  if (start >= currentSize && activeUpload && activeUpload.isUploading) {
    attempts = 0;
    while (start >= currentSize && activeUpload && activeUpload.isUploading && attempts < 15) {
      await new Promise(r => setTimeout(r, 100));
      try {
        currentSize = fs.statSync(filePath).size;
      } catch (e) {}
      attempts++;
    }
  }

  // Cap requested end to current bytes written on disk for growing uploads
  if (end >= currentSize) {
    end = Math.max(start, currentSize - 1);
  }

  if (start > end) {
    res.setHeader('Content-Range', `bytes */${totalSize}`);
    return res.status(416).send('Requested range not yet buffered');
  }

  const chunkSize = (end - start) + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${totalSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': mimeType
  });

  const readStream = fs.createReadStream(filePath, { start, end });
  readStream.pipe(res);

  readStream.on('error', (err) => {
    console.error('Error reading video stream:', err);
    if (!res.headersSent) {
      res.status(500).send(err.message);
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
