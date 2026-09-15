import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Navbar } from '../components/Navbar';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  // Fetch initial messages
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('room-main')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'room_id=eq.batch_main',
        },
        async (payload) => {
          // Fetch the new message with sender info
          const { data } = await supabase
            .from('messages')
            .select('*, profiles(full_name)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(full_name)')
        .eq('room_id', 'batch_main')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        room_id: 'batch_main',
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-[#800020] pt-24 pb-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#D4AF37] mb-1">
            Batch Main Chat
          </h1>
          <p className="text-white/80 text-sm">
            Real-time conversation for all Grizzlians
          </p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[#666666]">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <MessageCircle className="w-16 h-16 text-[#e5e5e5] mb-4" />
              <p className="text-[#666666] text-lg font-medium">
                No messages yet
              </p>
              <p className="text-[#999999] text-sm mt-1">
                Be the first Grizzlian to say hello!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === user.id;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                    {/* Sender Name (only for others' messages) */}
                    {!isOwnMessage && (
                      <p className="text-sm font-bold text-[#D4AF37] mb-1 ml-1">
                        {message.profiles.full_name}
                      </p>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-[#800020] text-white rounded-br-sm'
                          : 'bg-white text-[#1a1a1a] border border-[#e5e5e5] rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>

                    {/* Timestamp */}
                    <p className={`text-xs text-[#999999] mt-1 ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}>
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="bg-white border-t border-[#e5e5e5] rounded-xl p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-6 py-3 bg-[#800020] text-[#D4AF37] rounded-lg font-semibold hover:bg-[#600018] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
