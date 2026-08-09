import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, 
  Pause, 
  Send, 
  Users, 
  Film, 
  PlusCircle, 
  Share2, 
  Check, 
  FileVideo, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Tv, 
  Copy,
  Link,
  RefreshCw,
  Trash2
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

const DEFAULT_MOVIES = [
  {
    id: 'sintel',
    title: 'Sintel',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    description: 'A beautiful open-source fantasy film by the Blender Foundation. Sintel is a young woman who searches for a baby dragon she befriended.',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    description: 'A science-fiction movie set in Amsterdam, exploring a dystopian future where giant combat robots roam and a group of scientists try to save the city.',
    thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: 'A large and lovable rabbit deals with harassing forest creatures in this iconic open-source animation classic.',
    thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'elephants-dream',
    title: 'Elephants Dream',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    description: 'A surreal world of giant machines, pipes and mechanisms, where two characters explore the limits of their digital playground.',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 'cosmic-laundromat',
    title: 'Cosmos Laundromat',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Subway.mp4',
    description: 'On a desolate island, a suicidal sheep meets a quirky washing machine salesman who offers him a trip through different worlds.',
    thumbnail: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=500&auto=format&fit=crop&q=60'
  }
];

const REACTIONS = ['❤️', '😂', '😮', '🔥', '🍿', '😢'];

function App() {
  // Lobby States
  const [roomIdInput, setRoomIdInput] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('streaam_username') || '');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  
  // App States
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [currentVideo, setCurrentVideo] = useState(DEFAULT_MOVIES[0]);
  const [reactions, setReactions] = useState([]);
  const [activeTab, setActiveTab] = useState('library'); // library, custom, local
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  
  // Local File States
  const [localFile, setLocalFile] = useState(null);
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [partnerUpload, setPartnerUpload] = useState(null);
  const [syncP2PMode, setSyncP2PMode] = useState(false);
  
  // Custom Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [syncToast, setSyncToast] = useState('');
  const [overlayIcon, setOverlayIcon] = useState({ type: '', active: false });
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const ignoreTimeUpdate = useRef(false);

  // URL Auto-room join check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomIdInput(roomParam);
    }
  }, []);

  // Socket Connection & Listeners
  useEffect(() => {
    if (joinedRoom && roomId && username) {
      const newSocket = io(SOCKET_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('join_room', { roomId, username });
      });

      newSocket.on('room_state', (state) => {
        setUsers(state.users);
        setMessages(state.messages);
        setCurrentVideo(state.currentVideo);
        
        // Sync player initial state
        if (videoRef.current) {
          const video = videoRef.current;
          // Calculate drift if playing
          if (state.playback.isPlaying) {
            const timePassed = (Date.now() - state.playback.lastUpdated) / 1000;
            video.currentTime = state.playback.currentTime + timePassed;
            video.play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {
                // If browser blocks autoplay, mute and play
                video.muted = true;
                setIsMuted(true);
                video.play()
                  .then(() => {
                    setIsPlaying(true);
                    triggerSyncToast('Muted autoplay (Click player to unmute)');
                  })
                  .catch(() => {});
              });
          } else {
            video.currentTime = state.playback.currentTime;
            video.pause();
            setIsPlaying(false);
          }
        }
      });

      newSocket.on('users_update', (updatedUsers) => {
        setUsers(updatedUsers);
      });

      newSocket.on('user_joined', ({ username: joinedName }) => {
        triggerSyncToast(`${joinedName} joined the room!`);
      });

      newSocket.on('user_left', ({ username: leftName }) => {
        triggerSyncToast(`${leftName} left the room.`);
      });

      newSocket.on('receive_message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      newSocket.on('receive_reaction', ({ reaction, username: senderName, id }) => {
        const wobbleX1 = Math.random() * 80 - 40;
        const wobbleX2 = Math.random() * 80 - 40;
        const left = Math.random() * 80 + 10; // 10% to 90%
        
        setReactions(prev => [...prev, { id, reaction, wobbleX1, wobbleX2, left }]);
        
        setTimeout(() => {
          setReactions(prev => prev.filter(r => r.id !== id));
        }, 3000);
      });

      newSocket.on('partner_upload_progress', (data) => {
        setPartnerUpload(data);
      });

      newSocket.on('video_changed', (video) => {
        setPartnerUpload(null); // Reset progress
        setCurrentVideo(video);
        setIsPlaying(false);
        setCurrentTime(0);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.pause();
        }
        // If it's a local file, reset client local file state unless they already loaded it
        if (!video.isLocalFile) {
          setLocalFile(null);
          setLocalFileUrl('');
        }
      });

      newSocket.on('media_played', ({ currentTime: syncTime, username: actionUser }) => {
        if (videoRef.current) {
          ignoreTimeUpdate.current = true;
          videoRef.current.currentTime = syncTime;
          videoRef.current.play()
            .then(() => {
              setIsPlaying(true);
              triggerOverlayIcon('play');
              triggerSyncToast(`${actionUser} played`);
            })
            .catch(() => {
              // Muted autoplay backup
              if (videoRef.current) {
                videoRef.current.muted = true;
                setIsMuted(true);
                videoRef.current.play()
                  .then(() => {
                    setIsPlaying(true);
                    triggerOverlayIcon('play');
                    triggerSyncToast('Muted autoplay (Click player to unmute)');
                  })
                  .catch(() => {});
              }
            })
            .finally(() => {
              ignoreTimeUpdate.current = false;
            });
        }
      });

      newSocket.on('media_paused', ({ username: actionUser }) => {
        if (videoRef.current) {
          ignoreTimeUpdate.current = true;
          videoRef.current.pause();
          setIsPlaying(false);
          triggerOverlayIcon('pause');
          triggerSyncToast(`${actionUser} paused`);
          ignoreTimeUpdate.current = false;
        }
      });

      newSocket.on('media_seeked', ({ currentTime: syncTime, username: actionUser }) => {
        if (videoRef.current) {
          ignoreTimeUpdate.current = true;
          videoRef.current.currentTime = syncTime;
          setCurrentTime(syncTime);
          triggerSyncToast(`${actionUser} jumped to ${formatTime(syncTime)}`);
          ignoreTimeUpdate.current = false;
        }
      });

      newSocket.on('sync_response', (playback) => {
        if (videoRef.current) {
          ignoreTimeUpdate.current = true;
          if (playback.isPlaying) {
            const timePassed = (Date.now() - playback.lastUpdated) / 1000;
            videoRef.current.currentTime = playback.currentTime + timePassed;
            videoRef.current.play()
              .then(() => {
                setIsPlaying(true);
              })
              .catch(() => {
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  setIsMuted(true);
                  videoRef.current.play()
                    .then(() => {
                      setIsPlaying(true);
                      triggerSyncToast('Muted autoplay (Click player to unmute)');
                    })
                    .catch(() => {});
                }
              });
          } else {
            videoRef.current.currentTime = playback.currentTime;
            videoRef.current.pause();
            setIsPlaying(false);
          }
          triggerSyncToast('Synchronized with host');
          ignoreTimeUpdate.current = false;
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [joinedRoom, roomId]);

  // Chat scroll helper
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create room helper
  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    const generatedId = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('streaam_username', username);
    setRoomId(generatedId);
    setJoinedRoom(true);
  };

  // Join room helper
  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomIdInput.trim()) return;
    localStorage.setItem('streaam_username', username);
    setRoomId(roomIdInput.trim().toUpperCase());
    setJoinedRoom(true);
  };

  // Format seconds to HH:MM:SS / MM:SS
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
    
    if (hours > 0) {
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${hours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return `${minutes}:${formattedSeconds}`;
  };

  // Playback Control Actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !socket) return;
    
    if (video.paused) {
      video.play()
        .then(() => {
          setIsPlaying(true);
          triggerOverlayIcon('play');
          socket.emit('media_play', { roomId, currentTime: video.currentTime, username });
        })
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      triggerOverlayIcon('pause');
      socket.emit('media_pause', { roomId, username });
    }
  };

  const handleTimeUpdate = () => {
    if (ignoreTimeUpdate.current || !videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Auto-sync playback state with room on load
      requestSync();
    }
  };

  const handleScrubberChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      ignoreTimeUpdate.current = true;
      videoRef.current.currentTime = newTime;
    }
  };

  const handleScrubberRelease = () => {
    ignoreTimeUpdate.current = false;
    if (videoRef.current && socket) {
      socket.emit('media_seek', { roomId, currentTime: videoRef.current.currentTime, username });
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const requestFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.msRequestFullscreen) {
        videoRef.current.msRequestFullscreen();
      }
    }
  };

  // Sync request
  const requestSync = () => {
    if (socket) {
      socket.emit('sync_request', { roomId });
    }
  };

  // Custom Notifications / Visual feedback
  const triggerSyncToast = (text) => {
    setSyncToast(text);
    setTimeout(() => setSyncToast(''), 2500);
  };

  const triggerOverlayIcon = (type) => {
    setOverlayIcon({ type, active: true });
    setTimeout(() => setOverlayIcon({ type: '', active: false }), 800);
  };

  // Change Movie Library
  const selectLibraryMovie = (movie) => {
    if (socket) {
      socket.emit('video_change', { roomId, video: movie, username });
    }
  };

  // Submit custom url
  const handleCustomUrlSubmit = (e) => {
    e.preventDefault();
    if (!customUrl.trim() || !customTitle.trim() || !socket) return;
    
    const customMovie = {
      id: 'custom-' + Date.now(),
      title: customTitle.trim(),
      url: customUrl.trim(),
      description: 'Streamed from custom URL: ' + customUrl,
      thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=60',
      isCustom: true
    };

    socket.emit('video_change', { roomId, video: customMovie, username });
    setCustomTitle('');
    setCustomUrl('');
  };

  // Chat message submit
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    socket.emit('send_message', {
      roomId,
      message: {
        sender: username,
        text: chatInput.trim()
      }
    });

    setChatInput('');
  };

  // Reaction click
  const handleSendReaction = (reactChar) => {
    if (socket) {
      socket.emit('send_reaction', { roomId, reaction: reactChar, username });
    }
  };

  // Copy Room Code / Link Helpers
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Local File Drop & Input handlers
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadLocalFile(file);
  };

  const loadLocalFile = (file) => {
    setLocalFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalFileUrl(objectUrl);
    
    // If syncP2PMode is active OR if the room is currently expecting a local P2P sync file
    if (syncP2PMode || (currentVideo && currentVideo.url === 'p2p-local')) {
      setCurrentVideo({
        id: 'local-p2p-' + Date.now(),
        title: file.name,
        url: 'p2p-local',
        description: 'Synchronized local file playback.',
        isLocalFile: true
      });
      
      if (socket && (syncP2PMode || !currentVideo || currentVideo.title !== file.name)) {
        const localMovie = {
          id: 'local-p2p-' + Date.now(),
          title: file.name,
          url: 'p2p-local',
          description: `Direct Local File Sync. Please select your copy of "${file.name}" to watch together.`,
          isLocalFile: true
        };
        socket.emit('video_change', { roomId, video: localMovie, username });
      }
      triggerSyncToast('Local file synced successfully!');
      return;
    }
    
    // Fallback to standard cloud server upload mode:
    setIsUploading(true);
    
    setCurrentVideo({
      id: 'local-' + Date.now(),
      title: file.name,
      url: objectUrl,
      description: 'Uploading to server in the background...',
      isLocalFile: true
    });
    
    const uploadUrl = import.meta.env.DEV ? 'http://localhost:5000/api/upload' : '/api/upload';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    
    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        if (socket) {
          socket.emit('upload_progress', { roomId, username, percent, fileName: file.name });
        }
      }
    };
    
    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        // Once finished, emit video_change to update the room for the partner
        if (socket) {
          const localMovie = {
            id: 'local-' + Date.now(),
            title: file.name,
            url: data.url, // "/api/video"
            description: `Streaming directly from ${username}'s local storage.`,
            isLocalFile: false
          };
          socket.emit('video_change', { roomId, video: localMovie, username });
        }
        triggerSyncToast('Video uploaded and streaming to room!');
      } else {
        alert('Upload failed: ' + xhr.statusText);
      }
    };
    
    xhr.onerror = () => {
      setIsUploading(false);
      alert('Upload connection failed');
    };
    
    xhr.send(file);
  };

  const removeLocalFile = () => {
    setLocalFile(null);
    if (localFileUrl) {
      URL.revokeObjectURL(localFileUrl);
      setLocalFileUrl('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      loadLocalFile(file);
    }
  };

  // Leave room action
  const leaveRoom = () => {
    window.location.href = window.location.pathname; // Reload back to lobby
  };

  // Determine current video source
  const videoSourceUrl = (localFile && currentVideo.title === localFile.name)
    ? localFileUrl
    : (currentVideo.url 
        ? (currentVideo.url.startsWith('/') 
            ? `${SOCKET_URL}${currentVideo.url}` 
            : currentVideo.url) 
        : '');

  if (!joinedRoom) {
    return (
      <div className="lobby-container">
        <div className="lobby-hero">
          <h1>Watch Movies <span>Together</span> In Real-Time</h1>
          <p>Create a private theater for you and your girlfriend. Synchronized playback, reactions, and chat make you feel like you are sitting on the same couch, no matter the distance.</p>
        </div>

        <div className="lobby-cards-grid">
          {/* CREATE PARTY CARD */}
          <div className="lobby-card">
            <h2 className="card-title">
              <PlusCircle style={{ color: 'var(--primary)' }} />
              Start a Party
            </h2>
            <p className="card-desc">Create a new theater room and share the link with your partner.</p>
            
            <form onSubmit={handleCreateRoom}>
              <div className="form-group">
                <label>Your Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input 
                    type="text" 
                    placeholder="Enter your name..." 
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                Create Room & Watch
              </button>
            </form>
          </div>

          {/* JOIN PARTY CARD */}
          <div className="lobby-card">
            <h2 className="card-title">
              <Users style={{ color: 'var(--secondary)' }} />
              Join a Party
            </h2>
            <p className="card-desc">Enter the room code shared by your partner to jump into their stream.</p>
            
            <form onSubmit={handleJoinRoom}>
              <div className="form-group">
                <label>Your Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input 
                    type="text" 
                    placeholder="Enter your name..." 
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Room Code</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input 
                    type="text" 
                    placeholder="e.g. A1B2C3" 
                    className="form-input"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)' }}>
                Join Stream Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="app-header">
        <a href="/" className="brand" onClick={(e) => { e.preventDefault(); leaveRoom(); }}>
          <div className="brand-icon">
            <Tv size={22} color="white" />
          </div>
          <div className="brand-name">
            Streaam<span>Sync</span>
          </div>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={leaveRoom} className="btn-action-sync" style={{ background: 'rgba(239, 68, 110, 0.15)', borderColor: 'rgba(239, 68, 110, 0.3)', color: '#fecaca' }}>
            Leave Room
          </button>
          <div className="user-status-pill">
            <div className="status-dot"></div>
            <span>Watching as: <strong>{username}</strong></span>
          </div>
        </div>
      </header>

      <div className="room-container">
        {/* LEFT PANEL: VIDEOPLAYER & CONTROLS, LIBRARY */}
        <div className="main-content">
          <div className="player-wrapper" onDragOver={handleDragOver} onDrop={handleDrop}>
            {partnerUpload ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', padding: '2rem', background: '#0e0b16', color: 'white' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="status-dot" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px dashed var(--primary)', animation: 'spin 2s linear infinite' }}></div>
                  <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '1.1rem' }}>{partnerUpload.percent}%</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Streaming Incoming Movie</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{partnerUpload.username} is sending <strong>{partnerUpload.fileName}</strong> to the theater...</p>
                </div>
              </div>
            ) : (currentVideo && currentVideo.url === 'p2p-local' && (!localFile || localFile.name !== currentVideo.title)) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', padding: '2rem', background: '#0e0b16', color: 'white' }} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                <FileVideo size={48} color="var(--primary)" />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Local Sync File Required</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    The host is watching a local file: <strong>{currentVideo.title}</strong>.<br />
                    Please drag & drop or click here to select your copy of this movie to watch together.
                  </p>
                  <button className="tab-btn active" style={{ marginTop: '1.25rem', padding: '0.5rem 1.25rem', display: 'inline-block', borderRadius: 'var(--radius-md)' }}>
                    Select Copy of {currentVideo.title}
                  </button>
                </div>
              </div>
            ) : videoSourceUrl ? (
              <video
                ref={videoRef}
                src={videoSourceUrl}
                className="video-element"
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                muted={isMuted}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', padding: '2rem', background: '#0e0b16' }} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                <FileVideo size={48} color="var(--primary)" />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>No video loaded yet</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Drag & drop a video file here, browse local files, or choose a movie from the catalog below.</p>
                </div>
              </div>
            )}

            {/* Programmatic play/pause overlay splash animation */}
            <div className={`play-pause-overlay-icon ${overlayIcon.active ? 'active' : ''}`}>
              {overlayIcon.type === 'play' ? <Play size={36} fill="white" /> : <Pause size={36} fill="white" />}
            </div>

            {/* Waiting/Buffering Indicator */}
            {isBuffering && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="status-dot" style={{ width: '20px', height: '20px', animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite', backgroundColor: 'var(--primary)' }}></div>
              </div>
            )}

            {/* Sync actions toast notification on player */}
            {syncToast && (
              <div className="player-sync-indicator">
                <span className="status-dot"></span>
                <span>{syncToast}</span>
              </div>
            )}

            {/* Custom overlay controls */}
            {videoSourceUrl && (
              <div className="custom-controls-overlay">
                <div className="scrubber-container">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleScrubberChange}
                    onMouseUp={handleScrubberRelease}
                    onTouchEnd={handleScrubberRelease}
                    className="video-scrubber"
                  />
                </div>
                <div className="controls-row">
                  <div className="controls-left">
                    <button className="control-btn" onClick={togglePlay}>
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>
                    <button className="control-btn" onClick={requestSync} title="Force-sync to match partner's timeline">
                      <RefreshCw size={16} />
                    </button>
                    <span className="time-display">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <div className="controls-right">
                    <div className="volume-container">
                      <button className="control-btn" onClick={toggleMute}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="volume-slider"
                      />
                    </div>
                    <button className="control-btn" onClick={requestFullscreen}>
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Real-time floating reaction animation elements */}
            <div className="floating-reactions-layer">
              {reactions.map(r => (
                <div 
                  key={r.id} 
                  className="floating-reaction"
                  style={{
                    left: `${r.left}%`,
                    '--wobble-x-1': `${r.wobbleX1}px`,
                    '--wobble-x-2': `${r.wobbleX2}px`
                  }}
                >
                  {r.reaction}
                </div>
              ))}
            </div>
          </div>

          {/* MOVIE INFO CARD */}
          <div className="movie-info-card">
            <div className="movie-title-row">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Film size={20} color="var(--primary)" />
                  {currentVideo.title}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {currentVideo.isLocalFile ? '📂 Watch together via matching local files' : currentVideo.isCustom ? '🔗 Custom network URL' : '🎬 Curated Library'}
                </p>
              </div>
              <button className="btn-action-sync" onClick={requestSync}>
                <RefreshCw size={14} /> Synchronize Room
              </button>
            </div>
            <p className="movie-desc">{currentVideo.description}</p>
          </div>

          {/* CATALOG / SOURCE SELECTOR SECTION */}
          <div className="movie-catalog-section">
            <div className="section-header-tabs">
              <button 
                className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
                onClick={() => setActiveTab('library')}
              >
                Movie Library
              </button>
              <button 
                className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                Custom URL
              </button>
              <button 
                className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                onClick={() => setActiveTab('local')}
              >
                Local Sync File
              </button>
            </div>

            {activeTab === 'library' && (
              <div className="movies-grid">
                {DEFAULT_MOVIES.map(movie => (
                  <div 
                    key={movie.id} 
                    className={`movie-thumbnail-card ${currentVideo.id === movie.id ? 'active' : ''}`}
                    onClick={() => selectLibraryMovie(movie)}
                  >
                    <img src={movie.thumbnail} alt={movie.title} />
                    <div className="movie-thumbnail-overlay">
                      <div className="movie-thumbnail-title">{movie.title}</div>
                      <div className="movie-thumbnail-duration">Click to play together</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'custom' && (
              <form onSubmit={handleCustomUrlSubmit} className="custom-source-form">
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Paste any direct web video stream link (.mp4, .webm, HLS, etc.) to project it for both viewers instantly.</p>
                <div className="input-row">
                  <input
                    type="text"
                    placeholder="Movie title (e.g. My Favorite Movie)"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    required
                  />
                  <input
                    type="url"
                    placeholder="Direct Video URL (HTTPS link to video file)"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-inline-submit">
                    Stream Together
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'local' && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Have a movie file downloaded on your computer? Select it below to stream it directly from your machine!
                  The file will be instantly uploaded to your local server, allowing your partner to stream the video directly from your computer in real-time.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                  <input 
                    type="checkbox" 
                    id="sync-p2p" 
                    checked={syncP2PMode} 
                    onChange={(e) => setSyncP2PMode(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="sync-p2p" style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
                    <strong>Sync locally downloaded copies (Skip Upload / Instant play)</strong>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Recommended! Both select your copy of the file on your respective devices. Zero waiting, zero upload buffering.
                    </span>
                  </label>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="video/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                />

                {isUploading ? (
                  <div style={{ padding: '2.5rem', textAlign: 'center', background: 'rgba(168, 85, 247, 0.05)', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-md)' }}>
                    <div className="status-dot" style={{ width: '12px', height: '12px', display: 'inline-block', marginRight: '8px', animation: 'ping 1s infinite', backgroundColor: 'var(--primary)' }}></div>
                    <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>Uploading local movie to server...</strong>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>This takes just a second since the server is running on your localhost.</p>
                  </div>
                ) : !localFile ? (
                  <div 
                    className="drag-drop-zone"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <strong>Drag & Drop your video file here</strong>
                    <p>or click to browse local files (MP4, WebM, MKV)</p>
                  </div>
                ) : (
                  <div className="loaded-file-indicator">
                    <div className="loaded-file-info">
                      <FileVideo size={18} />
                      <span>Streaming file: <strong>{localFile.name}</strong> ({(localFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                    </div>
                    <button className="btn-remove-file" onClick={removeLocalFile} title="Remove file">
                      <Trash2 size={16} /> Remove File
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: SHARE INFO, CHAT, REACTIONS */}
        <div className="sidebar">
          {/* Share Section */}
          <div className="sidebar-header">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tv size={18} color="var(--primary)" /> Share Theater Link
            </h2>
            
            <div className="room-code-badge">
              <span>CODE: {roomId}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn-copy" onClick={copyRoomCode} title="Copy code">
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button className="btn-copy" onClick={copyRoomLink} title="Copy full invitation URL">
                  {copiedLink ? <Check size={16} /> : <Link size={16} />}
                </button>
              </div>
            </div>

            <div className="users-list">
              {users.map(u => (
                <div key={u.id} className={`user-badge ${u.username === username ? 'me' : ''}`}>
                  👤 {u.username} {u.username === username ? '(You)' : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Reaction Tray */}
          <div className="reaction-tray">
            {REACTIONS.map(reactChar => (
              <button 
                key={reactChar} 
                className="reaction-btn"
                onClick={() => handleSendReaction(reactChar)}
                title={`Send ${reactChar} reaction`}
              >
                {reactChar}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="chat-messages-container">
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`chat-bubble ${msg.isSystem ? 'system' : msg.sender === username ? 'mine' : ''}`}
              >
                {!msg.isSystem && (
                  <div className="message-meta">
                    {msg.sender === username ? 'You' : msg.sender}
                  </div>
                )}
                <div>{msg.text}</div>
              </div>
            ))}
            <div ref={chatEndRef}></div>
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendMessage} className="chat-input-form">
            <input
              type="text"
              placeholder="Send message..."
              className="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              required
            />
            <button type="submit" className="btn-send">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
