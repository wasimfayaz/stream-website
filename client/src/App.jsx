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
  Clock,
  Trash2,
  Heart,
  Search,
  Upload,
  Globe,
  LogOut,
  Bookmark,
  HeartHandshake,
  History
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import WatchlistSection from './components/WatchlistSection';
import MemoriesSection from './components/MemoriesSection';
import HistorySection from './components/HistorySection';

const SOCKET_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;


const DEFAULT_MOVIES = [];

const REACTIONS = ['Like', 'Love', 'Laugh', 'Wow', 'Sad', 'Fire'];

const MOVIE_SERVERS = [
  { id: 'vidsrc_pro', name: 'Server 1 (Vidsrc PRO - Vela/Rigel/Vega/Algol)', getUrl: (imdbId) => `https://vidsrc.pro/embed/movie/${imdbId}` },
  { id: '2embed', name: 'Server 2 (2Embed - Original English HD)', getUrl: (imdbId) => `https://www.2embed.cc/embed/${imdbId}` },
  { id: 'vidsrc_cc', name: 'Server 3 (VidSrc CC - Pure English Track)', getUrl: (imdbId) => `https://vidsrc.cc/v2/embed/movie/${imdbId}` },
  { id: 'vidsrc_net', name: 'Server 4 (VidSrc NET - Global English)', getUrl: (imdbId) => `https://vidsrc.net/embed/movie/${imdbId}` },
  { id: 'vidsrc_me', name: 'Server 5 (VidSrc ME - English Audio)', getUrl: (imdbId) => `https://vidsrc.me/embed/movie?imdb=${imdbId}&lang=en` },
  { id: 'moviesapi', name: 'Server 6 (MoviesAPI - Global English Mirror)', getUrl: (imdbId) => `https://moviesapi.club/movie/${imdbId}` },
  { id: 'autoembed', name: 'Server 7 (AutoEmbed - Forced English)', getUrl: (imdbId) => `https://player.autoembed.cc/embed/movie/${imdbId}?lang=en` }
];

const GENRES = ['All', 'Romance', 'Action', 'Comedy', 'Drama', 'Sci-Fi', '🇵🇭 Filipino'];

const DIVERSE_CATALOG = [
  { id: 'tt0251127', title: 'How to Lose a Guy in 10 Days', year: '2003', rating: '6.6', runtime: '116 min', genre: 'Romance', poster: 'https://m.media-amazon.com/images/M/MV5BMjE4NTA1NzExN15BMl5BanBnXkFtZTYwNjc3MjM3._V1_SX300.jpg', overview: 'Ben bets his coworkers that he can make a woman fall in love with him in 10 days. But along comes Andie, a writer with her own agenda.' },
  { id: 'tt0281358', title: 'A Walk to Remember', year: '2002', rating: '7.3', runtime: '102 min', genre: 'Romance', poster: 'https://m.media-amazon.com/images/M/MV5BMzVjMGVlOTYtMzM4Mi00NjFmLWE4NWUtYWZjM2Y1MDFlNDk2XkEyXkFqcGc@._V1_SX300.jpg', overview: 'Two North Carolina teens, Landon Carter and Jamie Sullivan, are thrown together after Landon gets into trouble and is sentenced to perform community service.' },
  { id: 'tt0332280', title: 'The Notebook', year: '2004', rating: '7.8', runtime: '123 min', genre: 'Romance', poster: 'https://m.media-amazon.com/images/M/MV5BMTgxMDM4NTM0NV5BMl5BanBnXkFtZTcwNjcxOTU3Ng@@._V1_SX300.jpg', overview: 'An epic love story centered around an older man who reads aloud to an older woman in a nursing home about a young couple’s romance.' },
  { id: 'tt3783958', title: 'La La Land', year: '2016', rating: '8.0', runtime: '128 min', genre: 'Romance', poster: 'https://m.media-amazon.com/images/M/MV5BMzUzNDM2NzM2MV5BMl5BanBnXkFtZTgwNTM3NTg4OTE@._V1_SX300.jpg', overview: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations.' },
  { id: 'tt0120338', title: 'Titanic', year: '1997', rating: '7.9', runtime: '194 min', genre: 'Romance', poster: 'https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmItY2U3Ny00NWVmLWI5OWEtYmUxNWMyN2IxZDY3XkEyXkFqcGc@._V1_SX300.jpg', overview: 'A seventeen-year-old aristocrat falls in love with a kind but poor artist aboard the luxurious, ill-fated R.M.S. Titanic.' },
  { id: 'tt1431045', title: 'Deadpool', year: '2016', rating: '8.0', runtime: '108 min', genre: 'Action', poster: 'https://m.media-amazon.com/images/M/MV5BYzE5MjY1ZDgtMTkyNC00MTMyLThhMjAtZGI5OTE1NzFlZGJjXkEyXkFqcGc@._V1_SX300.jpg', overview: 'A wisecracking mercenary gets experimented on and becomes immortal but ugly, and sets out to track down the man who ruined his looks.' },
  { id: 'tt4154756', title: 'Avengers: Infinity War', year: '2018', rating: '8.4', runtime: '149 min', genre: 'Action', poster: 'https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNzY1MTUwNTM@._V1_SX300.jpg', overview: 'The Avengers and their allies must be willing to sacrifice all in an attempt to defeat the powerful Thanos before his blitz puts an end to the universe.' },
  { id: 'tt1877830', title: 'The Batman', year: '2022', rating: '7.8', runtime: '176 min', genre: 'Action', poster: 'https://m.media-amazon.com/images/M/MV5BMDdmMTBiNTktHY5Ny00N2NmLTgwYzgtMDhjZmFhNjAxM2M3XkEyXkFqcGc@._V1_SX300.jpg', overview: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city’s hidden corruption.' },
  { id: 'tt1375666', title: 'Inception', year: '2010', rating: '8.8', runtime: '148 min', genre: 'Sci-Fi', poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg', overview: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.' },
  { id: 'tt0816692', title: 'Interstellar', year: '2014', rating: '8.7', runtime: '169 min', genre: 'Sci-Fi', poster: 'https://m.media-amazon.com/images/M/MV5BYzdjMDAxZGItMjI2My00ODA1LTlkNzItOWFjMDU5ZDJlYWY3XkEyXkFqcGc@._V1_SX300.jpg', overview: 'When Earth becomes uninhabitable, a team of ex-NASA researchers travels through a wormhole to find a new home for humanity.' },
  { id: 'tt0499549', title: 'Avatar', year: '2009', rating: '7.9', runtime: '162 min', genre: 'Sci-Fi', poster: 'https://m.media-amazon.com/images/M/MV5BMjE8Mjk3MDU2N15BMl5BanBnXkFtZTcwNzExMTU5MjE@._V1_SX300.jpg', overview: 'A paraplegic Marine dispatched to the moon Pandora on a unique mission becomes torn between following his orders and protecting his new home.' },
  { id: 'tt1630029', title: 'Avatar: The Way of Water', year: '2022', rating: '7.6', runtime: '192 min', genre: 'Sci-Fi', poster: 'https://m.media-amazon.com/images/M/MV5BYjhiNjBlODctN2ZiOC00YjVlLWFiNzAtNDJhMzg3ZmVjYzA1XkEyXkFqcGc@._V1_SX300.jpg', overview: 'Jake Sully lives with his family formed on the planet of Pandora. Once a familiar threat returns, Jake must work with Neytiri and the army of the Na\'vi.' },
  { id: 'tt6791096', title: 'Bohemian Rhapsody', year: '2018', rating: '7.9', runtime: '134 min', genre: 'Drama', poster: 'https://m.media-amazon.com/images/M/MV5BMTA2NDc3Njg5NDVeQTJeQWpwZ15BbWU4MDc1NDcxNTUz._V1_SX300.jpg', overview: 'The story of the legendary British rock band Queen and lead singer Freddie Mercury, leading up to their famous performance at Live Aid.' },
  { id: 'tt0137523', title: 'Fight Club', year: '1999', rating: '8.8', runtime: '139 min', genre: 'Drama', poster: 'https://m.media-amazon.com/images/M/MV5BOTgyOGQ1NDItNGU3Ny00MjU3LTg2YWEtN2FjNDZjYzU2MTAzXkEyXkFqcGc@._V1_SX300.jpg', overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.' },
  { id: 'tt0111161', title: 'The Shawshank Redemption', year: '1994', rating: '9.3', runtime: '142 min', genre: 'Drama', poster: 'https://m.media-amazon.com/images/M/MV5BMDAyY2FhYjctNDc5OS00MDNlLThiMGUtY2UxYWVkNGY2ZjljXkEyXkFqcGc@._V1_SX300.jpg', overview: 'Over the course of several years, two convicts form a friendship, seeking consolation and eventual redemption through basic compassion.' },
  { id: 'tt0443706', title: 'The Hangover', year: '2009', rating: '7.7', runtime: '100 min', genre: 'Comedy', poster: 'https://m.media-amazon.com/images/M/MV5BNGQwZjg5NDItY2UxYi00N2E3LTg3ZjAtZjQ5ZmNmZDAxNWNmXkEyXkFqcGc@._V1_SX300.jpg', overview: 'Three buddies wake up from a bachelor party in Las Vegas, with no memory of the previous night and the bachelor missing.' },
  { id: 'tt0800039', title: 'Superbad', year: '2007', rating: '7.6', runtime: '113 min', genre: 'Comedy', poster: 'https://m.media-amazon.com/images/M/MV5BMTc0NjIyNDExMV5BMl5BanBnXkFtZTcwMjgxMTU1MQ@@._V1_SX300.jpg', overview: 'Two co-dependent high school seniors deal with separation anxiety after their plan to stage a booze-soaked party goes awry.' },
  { id: 'tt10249826', title: 'Hello, Love, Goodbye', year: '2019', rating: '7.9', runtime: '118 min', genre: '🇵🇭 Filipino', poster: 'https://m.media-amazon.com/images/M/MV5BNzllMjY5NmItYTI2My00OWUxLWIyY2EtYTgzNzJiYzA2ZjUxXkEyXkFqcGc@._V1_SX300.jpg', overview: 'A nursing graduate working as a domestic helper in Hong Kong meets a bartender, and they navigate love and ambition.' },
  { id: 'tt30222384', title: 'Rewind', year: '2023', rating: '7.8', runtime: '112 min', genre: '🇵🇭 Filipino', poster: 'https://m.media-amazon.com/images/M/MV5BMDYwYWY0OTUtYTQ1MC00ODhjLWIwOGQtMDMzNzVhYjJhZjRhXkEyXkFqcGc@._V1_SX300.jpg', overview: 'John gets a chance to turn back time and save his wife Mary after a tragic accident.' },
  { id: 'tt8887680', title: 'The Hows of Us', year: '2018', rating: '7.2', runtime: '117 min', genre: '🇵🇭 Filipino', poster: 'https://m.media-amazon.com/images/M/MV5BOGZmNzc1ZjQtMDgzMS00Y2FlLWIxODktYzZlMzY5MjliYjRjXkEyXkFqcGc@._V1_SX300.jpg', overview: 'A young couple struggles to keep their relationship alive while building their dream house together.' },
  { id: 'tt2950944', title: 'Four Sisters and a Wedding', year: '2013', rating: '7.3', runtime: '125 min', genre: '🇵🇭 Filipino', poster: 'https://m.media-amazon.com/images/M/MV5BNTIzMTQ2NDEtMWJjMS00NDVhLWIyYzQtNTJkZDc4ZTIwMjgwXkEyXkFqcGc@._V1_SX300.jpg', overview: 'Four sisters try to stop their younger brother’s upcoming wedding.' },
  { id: 'tt4179374', title: 'That Thing Called Tadhana', year: '2014', rating: '7.6', runtime: '111 min', genre: '🇵🇭 Filipino', poster: 'https://m.media-amazon.com/images/M/MV5BMTgzMjM3MTA2Ml5BMl5BanBnXkFtZTgwNTU5MTY4NDE@._V1_SX300.jpg', overview: 'Two strangers meet at an airport and embark on a romantic road trip across Sagada.' },
  { id: 'tt5214040', title: 'A Second Chance', year: '2015', rating: '7.1', runtime: '130 min', genre: '🇵🇭 Filipino', poster: 'https://m.media-amazon.com/images/M/MV5BMjA5OTgxMDcyNV5BMl5BanBnXkFtZTgwMTQ3Mzk2NzE@._V1_SX300.jpg', overview: 'Popoy and Basha face the realities of marriage after their fairytale romance.' }
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
  // Auth & Couple Space States
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Lobby States
  const [roomIdInput, setRoomIdInput] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('streaam_username') || '');
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [roomId, setRoomId] = useState('');

  // Verify Auth session on load
  useEffect(() => {
    const token = localStorage.getItem('streaam_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(user => {
        if (user && user.id) {
          setCurrentUser(user);
          if (user.username) setUsername(user.username);
          if (user.couple && user.couple.inviteCode) {
            setRoomId(user.couple.inviteCode);
            setJoinedRoom(true);
          }
        } else {
          localStorage.removeItem('streaam_token');
        }
      })
      .catch(err => {
        console.error('Auth verification error:', err);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.username) setUsername(user.username);
    if (user.couple && user.couple.inviteCode) {
      setRoomId(user.couple.inviteCode);
      setJoinedRoom(true);
    }
  };

  // Fetch Persistent Chat History when currentUser is authenticated
  useEffect(() => {
    if (currentUser && currentUser.coupleId) {
      const token = localStorage.getItem('streaam_token');
      fetch(`${API_BASE}/api/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(dbMsgs => {
          if (Array.isArray(dbMsgs) && dbMsgs.length > 0) {
            setMessages(dbMsgs);
          }
        })
        .catch(err => console.error('Failed to load chat history:', err));
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('streaam_token');
    setCurrentUser(null);
    setJoinedRoom(false);
    window.location.reload();
  };

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
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [featuredMovie, setFeaturedMovie] = useState(DIVERSE_CATALOG[0]); // How to Lose a Guy in 10 Days
  
  // Free Movie Search States
  const [freeMovieQuery, setFreeMovieQuery] = useState('');
  const [freeSearchResults, setFreeSearchResults] = useState([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [selectedServer, setSelectedServer] = useState('vidsrc_pro');
  
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
        if (state.messages && state.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = state.messages.filter(m => m && m.id && !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
        }
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
    const targetMovieId = currentVideo ? (currentVideo.imdbId || currentVideo.tmdbId || currentVideo.id?.replace('free-movie-', '')) : null;
    if (currentVideo && currentVideo.isIframe && targetMovieId) {
      const serverObj = MOVIE_SERVERS.find(s => s.id === serverId) || MOVIE_SERVERS[0];
      const embedUrl = serverObj.getUrl(targetMovieId);
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

  const handleSurpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * DIVERSE_CATALOG.length);
    const randomMovie = DIVERSE_CATALOG[randomIndex];
    setFeaturedMovie(randomMovie);
    playFreeMovie(randomMovie);
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

  // Sync Stamps: programmatically force seeking both player timelines to the exact current timestamp of the initiator
  const syncTimestamps = () => {
    if (!socket) return;
    
    if (currentVideo && currentVideo.isIframe) {
      // Reload iframe embed streams with a fresh synchronization key
      socket.emit('video_change', { 
        roomId, 
        video: { ...currentVideo, syncKey: Date.now() }, 
        username 
      });
      triggerSyncToast('Synced video stream loading state!');
    } else if (videoRef.current) {
      const time = videoRef.current.currentTime;
      
      // Emit seek event
      socket.emit('media_seek', { roomId, currentTime: time, username });
      
      // Also sync play/pause states to match initiator
      if (videoRef.current.paused) {
        socket.emit('media_pause', { roomId, username });
      } else {
        socket.emit('media_play', { roomId, currentTime: time, username });
      }
      
      triggerSyncToast(`Synced stamp to ${formatTime(time)}!`);
    } else {
      triggerSyncToast('No video is active to synchronize timestamps.');
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
    if (!customUrl.trim() || !customTitle.trim()) return;
    
    let finalUrl = customUrl.trim();
    let isIframe = false;
    
    // YouTube Shorts: https://www.youtube.com/shorts/aB1cDefG23I
    if (finalUrl.includes('youtube.com/shorts/')) {
      const shortsId = finalUrl.split('/shorts/')[1]?.split('?')[0]?.split('&')[0];
      if (shortsId) {
        finalUrl = `https://www.youtube.com/embed/${shortsId}?autoplay=1`;
        isIframe = true;
      }
    } else {
      // Standard YouTube: watch?v=... or youtu.be/...
      const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = finalUrl.match(ytRegExp);
      if (match && match[2].length === 11) {
        finalUrl = `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
        isIframe = true;
      }
    }
    
    // Check if it's a direct raw video link (e.g. ends with a common video format extension)
    const rawVideoExtensions = ['.mp4', '.webm', '.m3u8', '.mpd', '.ogg', '.mov', '.mkv', '.avi'];
    const isRawVideo = rawVideoExtensions.some(ext => finalUrl.toLowerCase().includes(ext));
    
    // If it's not already YouTube (isIframe) and not a direct raw video, treat it as an embed/iframe player
    if (!isIframe && !isRawVideo) {
      isIframe = true;
    }
    
    const customMovie = {
      id: 'custom-' + Date.now(),
      title: customTitle.trim(),
      url: finalUrl,
      description: 'Streamed from custom URL: ' + finalUrl,
      thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=60',
      isCustom: true,
      isIframe: isIframe
    };

    setCurrentVideo(customMovie);

    if (socket) {
      socket.emit('video_change', { roomId, video: customMovie, username });
    }
    
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
    
    // Standalone mode: just load the video file locally and watch it instantly
    if (!socket || !joinedRoom) {
      setCurrentVideo({
        id: 'local-' + Date.now(),
        title: file.name,
        url: objectUrl,
        description: 'Playing local file from storage.',
        isLocalFile: true
      });
      triggerSyncToast('Local video loaded!');
      return;
    }
    
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



  return (
    <>
      {(!currentUser || !currentUser.coupleId) && !authLoading && (
        <AuthModal onAuthSuccess={handleAuthSuccess} initialUser={currentUser} />
      )}

      <header className="floating-pill-header">
        <div className="header-nav-row">
          <a href="/" className="header-brand" onClick={(e) => { e.preventDefault(); leaveRoom(); }}>
            <span>M</span>
          </a>
          <div className="pill-nav-links">
            <span className={`pill-nav-link ${activeTab === 'movies' ? 'active' : ''}`} onClick={() => setActiveTab('movies')}>
              <Film size={14} /> Home
            </span>
            <span className={`pill-nav-link ${activeTab === 'watch-together' ? 'active' : ''}`} onClick={() => setActiveTab('watch-together')}>
              Watch Together
            </span>
            <span className={`pill-nav-link ${activeTab === 'local' ? 'active' : ''}`} onClick={() => setActiveTab('local')}>Upload & Stream</span>
            <span className={`pill-nav-link ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>Custom URL</span>
            <span className={`pill-nav-link ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>
              <Bookmark size={14} /> Watchlist
            </span>
            <span className={`pill-nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <History size={14} /> History
            </span>
            <span className={`pill-nav-link ${activeTab === 'memories' ? 'active' : ''}`} onClick={() => setActiveTab('memories')}>
              <HeartHandshake size={14} /> Memories
            </span>
          </div>
        </div>

        <div className="header-actions-row">
          {currentUser && (
            <button 
              onClick={handleLogout} 
              className="btn-leave-room"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          )}
          
          <div className="user-status-pill">
            <div className="status-dot" style={{ backgroundColor: joinedRoom ? 'var(--primary)' : 'var(--text-muted)' }}></div>
            <span>
              {currentUser?.partner 
                ? `${currentUser.username} & ${currentUser.partner.username}` 
                : (currentUser?.username || 'Edilyn & Wasim')}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile-only top status bar */}
      <div className="mobile-top-bar">
        <div className="mobile-top-left">
          <div className="status-dot" style={{ backgroundColor: joinedRoom ? 'var(--primary)' : 'var(--text-muted)' }}></div>
          <span>
            {currentUser?.partner 
              ? `${currentUser.username} & ${currentUser.partner.username}` 
              : (currentUser?.username || 'Edilyn & Wasim')}
          </span>
        </div>

        {joinedRoom && (
          <button className="btn-leave-room" onClick={leaveRoom}>
            <LogOut size={12} /> Leave
          </button>
        )}
      </div>

      {/* Mobile-only bottom navigation */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${['movies', 'watch-together', 'local', 'custom'].includes(activeTab) ? 'active' : ''}`}
          onClick={() => setActiveTab('movies')}
        >
          <Film size={20} />
          <span>Theater</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'watchlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          <Bookmark size={20} />
          <span>Watchlist</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={20} />
          <span>History</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeTab === 'memories' ? 'active' : ''}`}
          onClick={() => setActiveTab('memories')}
        >
          <HeartHandshake size={20} />
          <span>Memories</span>
        </button>
      </nav>

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
                  {currentVideo.isLocalFile ? 'Watch together via matching local files' : currentVideo.isCustom ? 'Custom network URL' : 'Curated Library'}
                </p>
              </div>
              {joinedRoom && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-action-sync" onClick={requestSync} title="Request full synchronization from host">
                    <RefreshCw size={14} /> Sync Room
                  </button>
                  <button className="btn-action-sync btn-action-sync-solid" onClick={syncTimestamps} title="Force-sync current time stamp to partner">
                    <Clock size={14} /> Sync Stamps
                  </button>
                </div>
              )}
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
                className={`tab-btn ${activeTab === 'watch-together' ? 'active' : ''}`}
                onClick={() => setActiveTab('watch-together')}
              >
                Watch Together
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

            {activeTab === 'watch-together' && !joinedRoom && (
              <div className="lobby-container" style={{ padding: '1rem', width: '100%' }}>
                <div className="lobby-hero" style={{ textShadow: 'none', marginBottom: '2rem' }}>
                  <h1 style={{ fontSize: '2.5rem' }}>Watch Together <span>Lobby</span></h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Create or join a private room to stream in sync with chat, reactions, and flirty quotes between Wasim and Edilyn.</p>
                </div>

                <div className="lobby-cards-grid">
                  {/* CREATE PARTY CARD */}
                  <div className="lobby-card">
                    <h2 className="card-title">
                      <PlusCircle style={{ color: 'var(--primary)' }} />
                      Start a Party
                    </h2>
                    <p className="card-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1.25rem 0' }}>Create a new theater room and share the link with your partner.</p>
                    
                    <form onSubmit={handleCreateRoom}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Your Username</label>
                        <div className="input-wrapper">
                          <select 
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
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
                      <Users style={{ color: 'var(--primary)' }} />
                      Join a Party
                    </h2>
                    <p className="card-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1.25rem 0' }}>Enter the room code shared by your partner to jump into their stream.</p>
                    
                    <form onSubmit={handleJoinRoom}>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Your Username</label>
                        <div className="input-wrapper">
                          <select 
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                          >
                            <option value="" disabled>Select who is joining...</option>
                            <option value="Wasim">Wasim (Baby)</option>
                            <option value="Edilyn">Edilyn (Baby)</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Room Code</label>
                        <div className="input-wrapper">
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
                      <button type="submit" className="btn-primary">
                        Join Stream Room
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'movies' && (
              <div className="free-movies-container" style={{ padding: '1.5rem 0' }}>
                <form onSubmit={handleMovieSearch} className="custom-source-form" style={{ marginBottom: '1.5rem' }}>
                  <div className="input-row">
                    <input 
                      type="text" 
                      placeholder="Search any movie globally (e.g. A Walk to Remember, Titanic)..." 
                      className="form-input"
                      style={{ paddingLeft: '1.5rem' }}
                      value={freeMovieQuery}
                      onChange={(e) => setFreeMovieQuery(e.target.value)}
                    />
                    <button type="submit" className="btn-inline-submit">
                      {isSearchingMovies ? 'Searching...' : 'Search Movie'}
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {freeSearchResults.length > 0 ? `Search Results for "${freeMovieQuery}"` : 'Direct Movie Search'}
                  </span>
                  <div className="server-select-container">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Streaming Server:</label>
                    <select 
                      value={selectedServer}
                      onChange={(e) => switchServer(e.target.value)}
                      className="server-select-dropdown"
                    >
                      {MOVIE_SERVERS.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(24, 24, 27, 0.04)', border: '1px solid var(--border-light)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
                  <Volume2 size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <span><strong>Audio & Language Options:</strong> You can select <strong>English Audio</strong> inside the player by clicking the <strong>Settings Gear</strong> or <strong>Audio/CC Icon</strong> in the bottom right corner of the video screen!</span>
                </div>

                {freeSearchResults.length > 0 ? (
                  <div className="movies-grid">
                    {freeSearchResults.map(movie => (
                      <div 
                        key={movie.id} 
                        className="movie-thumbnail-card"
                        onClick={() => {
                          setFeaturedMovie(movie);
                          playFreeMovie(movie);
                        }}
                      >
                        <span className="movie-card-badge">Rating: {movie.rating || '7.5'}</span>
                        <img 
                          src={movie.poster_path ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`) : movie.poster} 
                          alt={movie.title} 
                        />
                        <div className="movie-thumbnail-overlay">
                          <div className="movie-thumbnail-title">{movie.title}</div>
                          <div className="movie-thumbnail-meta">{movie.year} • {movie.genre || 'Movie'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-lg)' }}>
                    <Search size={36} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.7 }} fill="none" />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Search for any movie globally above to start streaming instantly!</p>
                  </div>
                )}
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

            {activeTab === 'watchlist' && (
              <WatchlistSection socket={socket} roomId={roomId} />
            )}

            {activeTab === 'history' && (
              <HistorySection socket={socket} roomId={roomId} />
            )}

            {activeTab === 'memories' && (
              <MemoriesSection socket={socket} roomId={roomId} />
            )}
          </div>
        </div>

        <div className="sidebar">
          {joinedRoom ? (
            <>
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
                      <Users size={12} style={{ marginRight: '0.25rem' }} /> {u.username} {u.username === username ? '(You)' : ''}
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
            </>
          ) : (
            <div style={{ padding: '2rem 1.25rem', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <Tv size={48} style={{ color: 'var(--primary)', opacity: 0.8 }} />
              </div>
              <div>
                <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Watch Together</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Want to watch in sync with Edilyn? Start or join a Watch Together room to chat in real-time, send flirty reactions, and share local files!
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('watch-together')} 
                className="btn-primary" 
                style={{ 
                  background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)', 
                  borderRadius: 'var(--radius-md)', 
                  fontWeight: 'bold', 
                  padding: '0.75rem',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Go to Lobby
              </button>
            </div>
          )}
        </div>
      </div>
      

    </>
  );
}

export default App;
