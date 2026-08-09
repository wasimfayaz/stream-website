import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Clock, Heart, Star } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function WatchlistSection({ onSelectMovie }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [posterUrl, setPosterUrl] = useState('');

  const fetchWatchlist = async () => {
    try {
      const token = localStorage.getItem('streaam_token');
      const res = await fetch(`${API_BASE}/api/watchlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const token = localStorage.getItem('streaam_token');
      const res = await fetch(`${API_BASE}/api/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          posterUrl: posterUrl.trim() || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=60'
        })
      });
      const newItem = await res.json();
      setItems([newItem, ...items]);
      setTitle('');
      setPosterUrl('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const token = localStorage.getItem('streaam_token');
      await fetch(`${API_BASE}/api/watchlist/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      setItems(items.map(item => item.id === id ? { ...item, status } : item));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      const token = localStorage.getItem('streaam_token');
      await fetch(`${API_BASE}/api/watchlist/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Our Shared Watchlist ❤️
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            Movies and shows we plan to watch together.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}>
          <Plus size={16} /> Add Movie
        </button>
      </div>

      {showAddModal && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,75,110,0.3)', padding: '1.25rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Add to Shared Watchlist</h4>
          <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Movie Title (e.g. Interstellar)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <input 
              type="url" 
              className="form-input" 
              placeholder="Poster Image URL (optional)"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                Save to Watchlist
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading shared watchlist...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <Heart size={40} color="#ff416c" style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
          <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>Your Watchlist is Empty</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Add your favorite upcoming movies to watch together!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {items.map(item => (
            <div key={item.id} style={{ background: 'rgba(22,18,33,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '240px', background: '#000', overflow: 'hidden', position: 'relative' }}>
                <img 
                  src={item.posterUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=60'} 
                  alt={item.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{ position: 'absolute', top: '8px', right: '8px', background: item.status === 'WATCHED' ? '#10b981' : '#ff416c', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                  {item.status === 'WATCHED' ? 'Watched' : 'Want to Watch'}
                </span>
              </div>

              <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem 0', color: '#fff', fontSize: '0.95rem' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                    Added by {item.addedBy?.username || 'Partner'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'space-between' }}>
                  {item.status !== 'WATCHED' ? (
                    <button 
                      onClick={() => handleStatusChange(item.id, 'WATCHED')}
                      style={{ flex: 1, padding: '0.4rem', border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                    >
                      <CheckCircle size={12} /> Mark Watched
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStatusChange(item.id, 'WANT_TO_WATCH')}
                      style={{ flex: 1, padding: '0.4rem', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Unmark
                    </button>
                  )}

                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    style={{ padding: '0.4rem 0.6rem', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', borderRadius: '0.5rem', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
