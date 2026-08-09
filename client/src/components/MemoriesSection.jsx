import { useState, useEffect } from 'react';
import { Plus, Image, Calendar, Heart, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;

export default function MemoriesSection() {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [memoryDate, setMemoryDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchMemories = async () => {
    try {
      const token = localStorage.getItem('streaam_token');
      const res = await fetch(`${API_BASE}/api/memories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setMemories(data);
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return;
    try {
      const token = localStorage.getItem('streaam_token');
      const res = await fetch(`${API_BASE}/api/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mediaUrl: mediaUrl.trim(),
          caption: caption.trim(),
          memoryDate: memoryDate || new Date().toISOString()
        })
      });
      const newMemory = await res.json();
      setMemories([newMemory, ...memories]);
      setMediaUrl('');
      setCaption('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to save memory:', err);
    }
  };

  return (
    <div style={{ padding: '1.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(135deg, #ff416c, #ff4b2b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Our Private Memories ✨
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
            Photos, dates, and special moments saved forever in our private space.
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem' }}>
          <Plus size={16} /> Add Memory
        </button>
      </div>

      {showAddModal && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,75,110,0.3)', padding: '1.25rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#fff' }}>Add New Memory</h4>
          <form onSubmit={handleAddMemory} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input 
              type="url" 
              className="form-input" 
              placeholder="Photo or Image URL"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              required
            />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Caption / Special Note (e.g. Movie night together ❤️)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <input 
              type="date" 
              className="form-input" 
              value={memoryDate}
              onChange={(e) => setMemoryDate(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                Save Memory
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading memories...</p>
      ) : memories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <Heart size={40} color="#ff416c" style={{ marginBottom: '0.75rem', opacity: 0.6 }} />
          <h4 style={{ color: '#fff', margin: '0 0 0.5rem 0' }}>No Memories Added Yet</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Upload photos and save your favorite date nights together!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {memories.map(mem => (
            <div key={mem.id} style={{ background: 'rgba(22,18,33,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.25rem', overflow: 'hidden' }}>
              <div style={{ height: '220px', background: '#000', overflow: 'hidden' }}>
                <img 
                  src={mem.mediaUrl} 
                  alt="Memory" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ padding: '1rem' }}>
                {mem.caption && <p style={{ color: '#fff', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: '500' }}>{mem.caption}</p>}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={12} /> {new Date(mem.memoryDate).toLocaleDateString()}
                  </span>
                  <span>By {mem.uploadedBy?.username || 'Partner'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
