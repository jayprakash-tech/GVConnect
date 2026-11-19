import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../utils/supabase/client';
import { getUserProfile, UserProfile } from '../services/authService';
import { Navbar } from '../components/Navbar';
import { BackButton } from '../components/BackButton';

interface Message {
  id: number;
  sender_id: string;
  room_id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const connectTarget = searchParams.get('with') || '';
  const connectName = searchParams.get('name') || '';

  const rooms = useMemo(() => {
    const base = [
      { id: 'batch_main', label: 'All Alumni Hall' },
      { id: 'reunions', label: 'Reunions & Chapters' },
      { id: 'mentorship', label: 'Mentorship & Careers' },
    ];
    if (profile?.batch) {
      base.splice(1, 0, {
        id: `batch_${profile.batch}`,
        label: `Batch of ${profile.batch}`,
      });
    }
    return base;
  }, [profile?.batch]);

  const requestedRoom = searchParams.get('room') || 'batch_main';
  const activeRoom = rooms.some((r) => r.id === requestedRoom) ? requestedRoom : 'batch_main';
  const activeRoomMeta = rooms.find((r) => r.id === activeRoom) || rooms[0];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    getUserProfile(user.id).then((loaded) => {
      if (loaded) setProfile(loaded);
    });
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchMessages(activeRoom);
    }
  }, [user, activeRoom]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`room-${activeRoom}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${activeRoom}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(full_name)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) =>
              prev.some((m) => m.id === (data as Message).id)
                ? prev
                : [...prev, data as Message]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (roomId: string) => {
    setLoading(true);
    setSendError('');
    try {
      if (!isSupabaseConfigured) {
        const raw = localStorage.getItem('gv_demo_chat_messages');
        const all = raw ? (JSON.parse(raw) as Message[]) : [];
        setMessages(all.filter((m) => m.room_id === roomId));
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(full_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(80);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSwitch = (roomId: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('room', roomId);
    setSearchParams(next, { replace: true });
  };

  const handleClearConnectContext = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('with');
    next.delete('name');
    setSearchParams(next, { replace: true });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    setSendError('');

    try {
      if (!isSupabaseConfigured) {
        const currentProfile = profile || (await getUserProfile(user.id));
        const nextMsg: Message = {
          id: Date.now(),
          sender_id: user.id,
          room_id: activeRoom,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          profiles: {
            full_name: currentProfile?.full_name || user.username || user.email,
          },
        };
        const raw = localStorage.getItem('gv_demo_chat_messages');
        const all = raw ? (JSON.parse(raw) as Message[]) : [];
        const updatedAll = [...all, nextMsg];
        localStorage.setItem('gv_demo_chat_messages', JSON.stringify(updatedAll));
        setMessages(updatedAll.filter((m) => m.room_id === activeRoom));
        setNewMessage('');
        return;
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        room_id: activeRoom,
        content: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
      await fetchMessages(activeRoom);
    } catch (err: any) {
      setSendError(err?.message || 'Could not send message. Please try again.');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!user) return;
    if (!isSupabaseConfigured) {
      const raw = localStorage.getItem('gv_demo_chat_messages');
      const all = raw ? (JSON.parse(raw) as Message[]) : [];
      const updatedAll = all.filter((m) => !(m.id === messageId && m.sender_id === user.id));
      localStorage.setItem('gv_demo_chat_messages', JSON.stringify(updatedAll));
      setMessages(updatedAll.filter((m) => m.room_id === activeRoom));
      return;
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#120409] text-white flex flex-col">
      <Navbar />

      {/* Channel Header */}
      <div className="relative border-b border-white/10 bg-[#16040b] pt-24 pb-6 px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-45"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(128, 0, 32, 0.55), transparent 75%)',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between gap-4">
            <BackButton fallbackTo="/dashboard" label="Back" />
            <span className="font-mono-tabular text-[11px] uppercase tracking-[0.24em] text-[#ffcf8a]">
              {activeRoomMeta.label}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Alumni Group Chat
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Real-time channels for Grizzly Vidyalya batches, reunions, and mentorship
          </p>

          {/* Interactive Channel Switcher */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {rooms.map((room) => {
              const active = room.id === activeRoom;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleRoomSwitch(room.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#d4af37] text-[#1c040b]'
                      : 'border border-white/12 bg-[#120409] text-white/75 hover:border-[#d4af37]/40 hover:text-white'
                  }`}
                >
                  {room.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
        {connectName && (
          <div className="mb-4 rounded-xl border border-[#d4af37]/35 bg-[#1a060e] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-white/85">
              <Users className="w-4 h-4 text-[#ffcf8a] shrink-0" />
              <span>
                Connecting with <strong className="text-[#ffcf8a]">{connectName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const mention = connectTarget && !connectTarget.startsWith('user_')
                    ? `@${connectTarget} `
                    : `${connectName}, `;
                  setNewMessage((prev) =>
                    prev ? prev : `Hi ${mention}great connecting with you on GVConnect!`
                  );
                  inputRef.current?.focus();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#d4af37] text-[#1c040b] font-semibold hover:bg-[#ffcf8a] transition-colors cursor-pointer"
              >
                Say Hello
              </button>
              <button
                type="button"
                onClick={handleClearConnectContext}
                className="px-2.5 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 rounded-2xl border border-white/10 bg-[#1a060e]/55 p-4 sm:p-6 min-h-[340px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="font-mono-tabular text-xs uppercase tracking-[0.24em] text-white/60">
                Loading messages...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MessageCircle className="w-12 h-12 text-[#ffcf8a]/35 mb-3" />
              <p className="font-display text-lg font-bold text-white">
                No messages in {activeRoomMeta.label} yet
              </p>
              <p className="text-white/60 text-sm mt-1">
                Start the conversation with your fellow Grizzlians below.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className="max-w-[78%] sm:max-w-[70%]">
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold text-[#ffcf8a] mb-1 ml-1">
                        {message.profiles?.full_name || 'Alumni Member'}
                      </p>
                    )}

                    <div className="flex items-end gap-2">
                      {isOwnMessage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(message.id)}
                          aria-label="Delete message"
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-white/40 hover:text-red-300 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isOwnMessage
                            ? 'bg-[#800020] border border-[#d4af37]/35 text-white rounded-br-sm'
                            : 'bg-[#120409] border border-white/12 text-white/90 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>

                    <p
                      className={`font-mono-tabular text-[10px] text-white/45 mt-1 ${
                        isOwnMessage ? 'text-right mr-1' : 'ml-1'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {sendError && (
          <div className="mb-3 rounded-xl border border-red-400/35 bg-red-950/50 px-4 py-2.5 text-xs text-red-200">
            {sendError}
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="bg-[#1a060e]/90 border border-white/12 rounded-xl p-3 sm:p-4 shadow-lg"
        >
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${activeRoomMeta.label}...`}
              aria-label="Chat message"
              className="flex-1 px-4 py-3 border border-white/15 bg-[#120409] rounded-xl text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#d4af37] transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-5 py-3 bg-[#d4af37] text-[#1c040b] rounded-xl font-semibold text-sm hover:bg-[#ffcf8a] transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
