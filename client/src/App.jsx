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
  Trash2,
  Heart
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

const DEFAULT_MOVIES = [];

const REACTIONS = ['❤️', '😂', '😮', '🔥', '🍿', '😢'];

const MOVIE_SERVERS = [
  { id: 'vidsrc_cc', name: 'Server 1 (VidSrc CC - Ultra Fast)', getUrl: (imdbId) => `https://vidsrc.cc/v2/embed/movie/${imdbId}` },
  { id: 'vidsrc_me', name: 'Server 2 (VidSrc ME - Clean HD)', getUrl: (imdbId) => `https://vidsrc.me/embed/movie?imdb=${imdbId}` },
  { id: '2embed', name: 'Server 3 (2Embed - Stable)', getUrl: (imdbId) => `https://www.2embed.cc/embed/${imdbId}` },
  { id: 'vidsrc_pm', name: 'Server 4 (VidSrc PM - Fast Mirror)', getUrl: (imdbId) => `https://vidsrc.pm/embed/movie?imdb=${imdbId}` },
  { id: 'multiembed', name: 'Server 5 (SuperEmbed - Multi Mirror)', getUrl: (imdbId) => `https://multiembed.mov/directstream.php?video_id=${imdbId}` }
];

const POPULAR_MOVIES = [
  { id: 'tt0251127', title: 'How to Lose a Guy in 10 Days', year: '2003', poster: 'https://m.media-amazon.com/images/M/MV5BMjE4NTA1NzExN15BMl5BanBnXkFtZTYwNjc3MjM3._V1_QL75_UY562_CR0,0,380,562_.jpg', overview: 'Ben bets his coworkers that he can make a woman fall in love with him in 10 days. But along comes Andie, a writer with her own agenda.' },
  { id: 'tt0120338', title: 'Titanic', year: '1997', poster: 'https://image.tmdb.org/t/p/w500/9cqN121KmBkWi828D8RStfiHWTo.jpg', overview: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.' },
  { id: 'tt0332280', title: 'The Notebook', year: '2004', poster: 'https://image.tmdb.org/t/p/w500/rNzQIGRG81KScujVJme2cTSu2.jpg', overview: 'An epic love story centered around an older man who reads aloud to an older woman in a nursing home.' },
  { id: 'tt3783958', title: 'La La Land', year: '2016', poster: 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwo1ikxsRFAZWVvMxs.jpg', overview: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations.' },
  { id: 'tt1375666', title: 'Inception', year: '2010', poster: 'https://image.tmdb.org/t/p/w500/oYuLEW9W2vBBGLBocqZXi12xIQp.jpg', overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.' },
  { id: 'tt0499549', title: 'Avatar', year: '2009', poster: 'https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg', overview: 'A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following his orders and protecting the world he feels is his home.' },
  { id: 'tt0816692', title: 'Interstellar', year: '2014', poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', overview: 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.' },
  { id: 'tt4154756', title: 'Avengers: Infinity War', year: '2018', poster: 'https://image.tmdb.org/t/p/w500/7WsyChLLEzFiDOVTGfaZaE3zRBV.jpg', overview: 'The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos.' },
  { id: 'tt0137523', title: 'Fight Club', year: '1999', poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.' }
];

const FLIRTY_QUOTES = [
  "I love you so much, Baby! ❤️",
  "You are my whole universe, Edilyn. ✨",
  "Baby, you look absolutely stunning today! 😍",
  "No matter the distance, my heart is always with you, Baby. 💓",
  "Wasim is the luckiest guy in the world to have you, Baby! 💕",
  "No distance can ever stop our love, Edilyn. 🌍💞",
  "I miss you so much, Baby! 😘",
  "You are my favorite movie and my forever partner. 🎬❤️",
  "Wasim ❤️ Edilyn forever and ever!",
  "Baby, you are the best thing that ever happened to me. 💖",
  "Every beat of my heart is just for you, Baby Edilyn. 💗",
  "Every second spent with you is a dream come true, Baby. 🥰",
  "Baby, I want to watch movies with you forever! 💑🍿",
  "You stole my heart and I'm never asking for it back, Baby. 💕",
  "Counting down every second until I can hold you in my arms, Edilyn! ❤️"
];

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
  const [currentVideo, setCurrentVideo] = useState({
    id: 'welcome',
    title: 'No movie loaded yet',
    url: '',
    description: 'Select the Local Sync File or Custom URL tab below to stream together.',
    isLocalFile: false
  });
  const [reactions, setReactions] = useState([]);
  const [activeTab, setActiveTab] = useState('movies'); // movies, local, custom
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  
  // Free Movie Search States
  const [freeMovieQuery, setFreeMovieQuery] = useState('');
  const [freeSearchResults, setFreeSearchResults] = useState([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [selectedServer, setSelectedServer] = useState('vidsrc_me');
  
  // Local File States
  const [localFile, setLocalFile] = useState(null);
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [partnerUpload, setPartnerUpload] = useState(null);
  const [syncP2PMode, setSyncP2PMode] = useState(false);
  const [flirtyQuote, setFlirtyQuote] = useState('');
  const [hasConfirmedFile, setHasConfirmedFile] = useState(false);
  
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
  const playerWrapperRef = useRef(null);
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
        setHasConfirmedFile(false);
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

      newSocket.on('receive_flirt', ({ quote, sender }) => {
        setFlirtyQuote(quote);
        setTimeout(() => {
          setFlirtyQuote('');
        }, 7000);
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

  // Timed flirty quote trigger for Edilyn and Wasim
  useEffect(() => {
    if (joinedRoom) {
      const showRandomQuote = () => {
        const randomIndex = Math.floor(Math.random() * FLIRTY_QUOTES.length);
        setFlirtyQuote(FLIRTY_QUOTES[randomIndex]);
        
        // Auto-dismiss after 7 seconds
        setTimeout(() => {
          setFlirtyQuote('');
        }, 7000);
      };
      
      // Trigger first one after 30 seconds
      const initialTimer = setTimeout(showRandomQuote, 30000);
      
      // Interval for every 150 seconds
      const interval = setInterval(showRandomQuote, 150000);
      
      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
      };
    }
  }, [joinedRoom]);

  const triggerFlirt = () => {
    const randomIndex = Math.floor(Math.random() * FLIRTY_QUOTES.length);
    const quote = FLIRTY_QUOTES[randomIndex];
    if (socket) {
      socket.emit('send_flirt', { roomId, quote, sender: username });
    } else {
      setFlirtyQuote(quote);
      setTimeout(() => {
        setFlirtyQuote('');
      }, 7000);
    }
  };

  // Free Movie Search API Handler (OMDb API - Bypasses regional blocks)
  const handleMovieSearch = async (e) => {
    if (e) e.preventDefault();
    if (!freeMovieQuery.trim()) return;
    setIsSearchingMovies(true);

    // Auto-correct common title typos (e.g. "how to love a guy" -> "how to lose a guy")
    let queryToSearch = freeMovieQuery;
    if (queryToSearch.toLowerCase().includes('how to love a guy')) {
      queryToSearch = queryToSearch.replace(/how to love a guy/i, 'How to Lose a Guy');
    }

    try {
      let res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(queryToSearch)}&apikey=thewdb&type=movie`);
      let data = await res.json();
      
      // Retry with original query if auto-correct returned nothing
      if (!data.Search && queryToSearch !== freeMovieQuery) {
        res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(freeMovieQuery)}&apikey=thewdb&type=movie`);
        data = await res.json();
      }

      if (data.Search) {
        // Map OMDb results to our standard format
        const mappedResults = data.Search.filter(m => m.Poster !== 'N/A').map(m => ({
          id: m.imdbID,
          title: m.Title,
          poster_path: m.Poster,
          overview: `Released: ${m.Year}`
        }));
        setFreeSearchResults(mappedResults);
      } else {
        setFreeSearchResults([]);
      }
    } catch (err) {
      console.error('Failed to search movies', err);
    } finally {
      setIsSearchingMovies(false);
    }
  };

  const playFreeMovie = (movie, serverId = selectedServer) => {
    const serverObj = MOVIE_SERVERS.find(s => s.id === serverId) || MOVIE_SERVERS[0];
    const embedUrl = serverObj.getUrl(movie.id); // movie.id is now the imdbID
    
    // Support absolute URLs (OMDb) and relative paths (TMDB legacy)
    const posterUrl = movie.poster_path 
      ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
      : movie.poster;
    
    const videoData = {
      id: `free-movie-${movie.id}`,
      imdbId: movie.id,
      title: movie.title,
      url: embedUrl,
      description: movie.overview || `Streaming ${movie.title} on ${serverObj.name}`,
      isIframe: true,
      serverId: serverObj.id,
      poster: posterUrl
    };
    
    setCurrentVideo(videoData);
    if (socket) {
      socket.emit('video_change', { roomId, video: videoData, username });
    }
  };

  const switchServer = (serverId) => {
    setSelectedServer(serverId);
    if (currentVideo && currentVideo.isIframe && currentVideo.tmdbId) {
      const serverObj = MOVIE_SERVERS.find(s => s.id === serverId) || MOVIE_SERVERS[0];
      const embedUrl = serverObj.getUrl(currentVideo.tmdbId);
      const videoData = {
        ...currentVideo,
        url: embedUrl,
        serverId: serverObj.id,
        description: `Streaming ${currentVideo.title} on ${serverObj.name}`
      };
      setCurrentVideo(videoData);
      if (socket) {
        socket.emit('video_change', { roomId, video: videoData, username });
      }
    }
  };

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
    const target = playerWrapperRef.current || videoRef.current;
    if (!target) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (target.requestFullscreen) {
        target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      } else if (target.msRequestFullscreen) {
        target.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Sync request for both local files & free movie server embeds
  const requestSync = () => {
    if (socket) {
      if (currentVideo && currentVideo.isIframe) {
        socket.emit('video_change', { 
          roomId, 
          video: { ...currentVideo, syncKey: Date.now() }, 
          username 
        });
        triggerSyncToast('Synchronized movie stream on both screens!');
      } else {
        socket.emit('sync_request', { roomId });
      }
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
    setHasConfirmedFile(true);
    
    // If syncP2PMode is active OR if the room is currently expecting a local P2P sync file
    if (syncP2PMode || (currentVideo && currentVideo.url === 'p2p-local')) {
      setCurrentVideo({
        id: 'local-p2p-' + Date.now(),
        title: file.name,
        url: 'p2p-local',
        description: 'Synchronized local file playback.',
        isLocalFile: true
      });
      
      // Only emit video_change to the server if we are the initiator (syncP2PMode enabled)
      if (socket && syncP2PMode) {
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

  // Determine current video source (for HTML5 <video> tag)
  const videoSourceUrl = currentVideo.isIframe 
    ? '' 
    : (localFile && (currentVideo.isLocalFile || currentVideo.url === 'p2p-local'))
      ? localFileUrl
      : (currentVideo.url && currentVideo.url !== 'p2p-local'
          ? (currentVideo.url.startsWith('/') 
              ? `${SOCKET_URL}${currentVideo.url}` 
              : currentVideo.url) 
          : '');

  if (!joinedRoom) {
    return (
      <div className="lobby-container">
        <div className="lobby-hero">
          <h1>Babies <span>Watch Party</span></h1>
          <p>Wasim & Edilyn's private theater to watch movies together in real-time. Chat, send reactions, and stay close. Mahal kita, Baby! ❤️</p>
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
                  <select 
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem', background: '#0f172a', color: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="" disabled>Select who is joining...</option>
                    <option value="Wasim">Wasim (Baby)</option>
                    <option value="Edilyn">Edilyn (Baby)</option>
                  </select>
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
                  <select 
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    style={{ paddingLeft: '2.5rem', background: '#0f172a', color: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
                  >
                    <option value="" disabled>Select who is joining...</option>
                    <option value="Wasim">Wasim (Baby)</option>
                    <option value="Edilyn">Edilyn (Baby)</option>
                  </select>
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
        <div className="header-top-row">
          <a href="/" className="brand" onClick={(e) => { e.preventDefault(); leaveRoom(); }}>
            <div className="brand-icon" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)' }}>
              <Tv size={22} color="white" />
            </div>
            <div className="brand-name">
              Babies <span>Watch Party</span>
            </div>
          </a>
          <div className="user-status-pill header-pill-mobile">
            <div className="status-dot"></div>
            <span>Watching as: <strong>{username}</strong></span>
          </div>
        </div>

        <div className="header-actions">
          <button 
            onClick={triggerFlirt} 
            className="btn-action-sync btn-flirt" 
            style={{ 
              background: 'rgba(14, 165, 233, 0.15)', 
              borderColor: 'rgba(14, 165, 233, 0.3)', 
              color: '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              animation: 'heartBeat 2.5s infinite'
            }}
          >
            <Heart size={14} fill="var(--primary)" color="var(--primary)" />
            <span className="flirt-btn-text">Flirt with Baby</span>
          </button>
          <button onClick={leaveRoom} className="btn-action-sync btn-leave" style={{ background: 'rgba(239, 68, 110, 0.15)', borderColor: 'rgba(239, 68, 110, 0.3)', color: '#fecaca' }}>
            <span className="leave-btn-text">Leave Room</span>
          </button>
          <div className="user-status-pill header-pill-desktop">
            <div className="status-dot"></div>
            <span><span className="watching-prefix">Watching as: </span><strong>{username}</strong></span>
          </div>
        </div>
      </header>

      <div className="room-container">
        {/* LEFT PANEL: VIDEOPLAYER & CONTROLS, LIBRARY */}
        <div className="main-content">
          <div ref={playerWrapperRef} className="player-wrapper" onDragOver={handleDragOver} onDrop={handleDrop}>
            {/* Always visible Floating Fullscreen Button */}
            <button 
              className="player-floating-fullscreen-btn" 
              onClick={requestFullscreen}
              title="Toggle Theater Fullscreen"
            >
              <Maximize2 size={16} color="white" />
              <span className="fullscreen-btn-text">Fullscreen</span>
            </button>

            {/* Synchronized Flirt Toast overlay on top of video / inside fullscreen */}
            {flirtyQuote && (
              <div className="video-flirt-overlay">
                {flirtyQuote}
              </div>
            )}

            {currentVideo.isIframe ? (
              <>
                <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 40, background: 'rgba(11, 19, 36, 0.75)', backdropFilter: 'blur(4px)', color: 'var(--text-muted)', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Stuck loading? Disable Adblocker / Brave Shields
                </div>
                <iframe 
                  src={currentVideo.url}
                  className="video-element-iframe"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  title={currentVideo.title}
                  style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
                />
              </>
            ) : partnerUpload ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', padding: '2rem', background: '#050b14', color: 'white' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="status-dot" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px dashed var(--primary)', animation: 'spin 2s linear infinite' }}></div>
                  <span style={{ position: 'absolute', fontWeight: 'bold', fontSize: '1.1rem' }}>{partnerUpload.percent}%</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Streaming Incoming Movie</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>{partnerUpload.username} is sending <strong>{partnerUpload.fileName}</strong> to the theater...</p>
                </div>
              </div>
            ) : (currentVideo && currentVideo.url === 'p2p-local' && (!localFile || !hasConfirmedFile)) ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem', padding: '2rem', background: '#050b14', color: 'white' }} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', padding: '2rem', background: '#050b14' }} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
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

            {/* Custom overlay controls (Only for HTML5 videos and local files, not free server iframe embeds) */}
            {videoSourceUrl && !currentVideo.isIframe && (
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
                className={`tab-btn ${activeTab === 'movies' ? 'active' : ''}`}
                onClick={() => setActiveTab('movies')}
              >
                Search & Stream Movies
              </button>
              <button 
                className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                onClick={() => setActiveTab('local')}
              >
                Upload & Stream File
              </button>
              <button 
                className={`tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                Custom URL
              </button>
            </div>

            {activeTab === 'movies' && (
              <div className="free-movies-container">
                <form onSubmit={handleMovieSearch} className="custom-source-form" style={{ marginBottom: '1.25rem' }}>
                  <div className="input-row">
                    <input 
                      type="text" 
                      placeholder="Search any movie (e.g. Titanic, Avatar, Inception)..." 
                      className="form-input"
                      style={{ paddingLeft: '1rem' }}
                      value={freeMovieQuery}
                      onChange={(e) => setFreeMovieQuery(e.target.value)}
                    />
                    <button type="submit" className="btn-inline-submit">
                      {isSearchingMovies ? 'Searching...' : 'Search Movie'}
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {freeSearchResults.length > 0 ? `Search Results for "${freeMovieQuery}"` : 'Popular Quick Picks'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Server:</label>
                    <select 
                      value={selectedServer}
                      onChange={(e) => switchServer(e.target.value)}
                      style={{ background: '#0f172a', color: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    >
                      {MOVIE_SERVERS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="movies-grid">
                  {(freeSearchResults.length > 0 ? freeSearchResults : POPULAR_MOVIES).map(movie => (
                    <div 
                      key={movie.id} 
                      className="movie-thumbnail-card"
                      onClick={() => playFreeMovie(movie)}
                    >
                      <img 
                        src={movie.poster_path ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`) : movie.poster} 
                        alt={movie.title} 
                      />
                      <div className="movie-thumbnail-overlay">
                        <div className="movie-thumbnail-title">{movie.title}</div>
                        <div className="movie-thumbnail-duration">▶ Play Free Stream</div>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <strong>Standard Mode:</strong> Just Drag & Drop a movie file here! It will upload to the server and stream directly to your partner in real-time while you watch together (just like before).
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
                    <strong>Offline P2P Mode (ONLY if you BOTH already downloaded the file)</strong>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Check this box ONLY if you already sent her the file via WhatsApp/Drive. Skips the upload phase!
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
      
      {flirtyQuote && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 9999,
          background: 'rgba(14, 165, 233, 0.15)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(14, 165, 233, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(14, 165, 233, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          color: 'white',
          animation: 'slideUpFade 0.5s ease-out',
          maxWidth: '320px'
        }}>
          <div style={{
            fontSize: '1.75rem',
            animation: 'heartBeat 1.2s infinite'
          }}>❤️</div>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', fontWeight: 'bold' }}>Wasim & Edilyn</div>
            <div style={{ fontSize: '0.95rem', marginTop: '0.2rem', lineHeight: '1.4', fontWeight: '500' }}>{flirtyQuote}</div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
