'use client';

import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  userId: number;
  email: string;
  tenantId: number;
  tenantSlug: string;
  role: string;
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    // In a real browser environment, this would use localStorage
    // For Claude.ai artifacts, we start with no saved token
    setLoading(false);
  }, []);

  const fetchUserInfo = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        await fetchNotes(authToken);
      } else {
        // In real browser: localStorage.removeItem('token');
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
      // In real browser: localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const notesData = await response.json();
        setNotes(notesData);
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const { token } = await response.json();
        // In real browser: localStorage.setItem('token', token);
        setToken(token);
        await fetchUserInfo(token);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  const handleLogout = () => {
    // In real browser: localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setNotes([]);
    setEmail('');
    setPassword('');
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
        }),
      });

      if (response.ok) {
        setNoteTitle('');
        setNoteContent('');
        setShowNoteForm(false);
        await fetchNotes(token);
      } else {
        const errorData = await response.json();
        if (errorData.error === 'note_limit_reached') {
          setError(errorData.message);
        } else {
          setError('Failed to create note');
        }
      }
    } catch (err) {
      setError('Failed to create note');
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchNotes(token);
      } else {
        setError('Failed to delete note');
      }
    } catch (err) {
      setError('Failed to delete note');
    }
  };

  const handleUpgradeTenant = async () => {
    if (!token || !user || user.role !== 'admin') return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/tenants/${user.tenantSlug}/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setError(null);
        alert('Tenant upgraded to Pro plan successfully!');
        // Refresh user info to get updated plan status
        await fetchUserInfo(token);
      } else {
        setError('Failed to upgrade tenant');
      }
    } catch (err) {
      setError('Failed to upgrade tenant');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">SaaS Notes App</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Login
            </button>
          </form>
          <div className="mt-6 text-sm text-gray-600">
            <p className="font-semibold">Test Accounts:</p>
            <p>admin@acme.test (Admin)</p>
            <p>user@acme.test (Member)</p>
            <p>admin@globex.test (Admin)</p>
            <p>user@globex.test (Member)</p>
            <p className="mt-2 text-xs">Password: <strong>password</strong></p>
          </div>
        </div>
      </div>
    );
  }

  const canUpgrade = user?.role === 'admin' && notes.length >= 3;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">SaaS Notes App</h1>
              <p className="text-gray-600">
                Welcome, {user?.email} ({user?.role}) - {user?.tenantSlug}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Notes ({notes.length}/3 for Free plan)</h2>
            <div className="space-x-2">
              {canUpgrade && (
                <button
                  onClick={handleUpgradeTenant}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Upgrade to Pro
                </button>
              )}
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {showNoteForm ? 'Cancel' : 'New Note'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {showNoteForm && (
            <form onSubmit={handleCreateNote} className="bg-gray-50 p-4 rounded mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Content
                  </label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Note
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {notes.length === 0 ? (
              <p className="text-gray-500">No notes yet. Create your first note!</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{note.title}</h3>
                      <p className="text-gray-600 mt-2">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Created: {new Date(note.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}