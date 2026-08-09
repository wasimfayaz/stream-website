import { useState, useEffect } from 'react';
import { Film, Calendar, Clock, Star, Heart } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function HistorySection({ socket, roomId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      if (!roomId) return;
      const res = await fetch(`${API_BASE}/api/watch-history?roomId=${encodeURIComponent(roomId)}`, {
        headers: { 'x-room-id': roomId }
      });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [roomId]);

  useEffect(() => {
    if (socket) {
      const handleHistoryUpdate = () => {
        fetchHistory();
      };
      socket.on('history_updated', handleHistoryUpdate);
      return () => {
        socket.off('history_updated', handleHistoryUpdate);
      };
    }
  }, [socket, roomId]);

  const formatDuration = (secs) => {
    if (!secs) return 'N/A';
    const mins = Math.floor(secs / 60);
    return `${mins} mins`;
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Our Watch History 🎬
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
          Every movie and stream watched together in our private space.
        </p>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading watch history...</p>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <Film size={40} color="#ff416c" style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
          <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>No Movies Watched Yet</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Start a movie in the Theater and your history will be recorded automatically!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map(session => (
            <div key={session.id} style={{ background: 'rgba(22,18,33,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', padding: '1rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '110px', background: '#000', borderRadius: '0.75rem', overflow: 'hidden', flexShrink: 0 }}>
                <img 
                  src={session.posterUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=60'} 
                  alt={session.movieTitle}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.35rem 0', color: '#fff', fontSize: '1.1rem' }}>{session.movieTitle}</h4>
                
                <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={13} /> {new Date(session.startedAt).toLocaleDateString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={13} /> {formatDuration(session.duration)}
                  </span>
                  <span style={{ color: session.isCompleted ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                    {session.isCompleted ? 'Completed' : 'Incomplete / Stopped'}
                  </span>
                </div>

                {session.ratings && session.ratings.length > 0 ? (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {session.ratings.map(r => (
                      <span key={r.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem', color: '#ffb703', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star size={12} fill="#ffb703" /> {r.user?.username}: {r.stars}/5
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>No ratings added yet</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
