import { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import type { MessagePayload } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Send, Globe, User } from 'lucide-react';

type View = 'global' | 'private';

export default function ChatPage() {
  const { socket, onlineUsers } = useSocket();
  const { user } = useAuth();
  const [view, setView] = useState<View>('global');
  const [globalMessages, setGlobalMessages] = useState<MessagePayload[]>([]);
  const [privateMessages, setPrivateMessages] = useState<MessagePayload[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingHistoryFor = useRef<number | null>(null);

  // Fetch global history on connect
  useEffect(() => {
    if (!socket) return;
    socket.emit('chat:get_history', {});
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: MessagePayload) => {
      if (msg.receiverId === null) {
        setGlobalMessages((prev) => [...prev, msg]);
      } else {
        setPrivateMessages((prev) => [...prev, msg]);
      }
    };

    const handleHistory = (msgs: MessagePayload[]) => {
      if (msgs.length === 0) {
        if (pendingHistoryFor.current !== null) {
          setPrivateMessages([]);
          pendingHistoryFor.current = null;
        } else {
          setGlobalMessages([]);
        }
        return;
      }
      if (msgs[0].receiverId === null) {
        setGlobalMessages(msgs);
      } else {
        setPrivateMessages(msgs);
        pendingHistoryFor.current = null;
      }
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:history', handleHistory);
    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:history', handleHistory);
    };
  }, [socket]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages, privateMessages, view]);

  const selectUser = (id: number, username: string) => {
    setSelectedUserId(id);
    setSelectedUsername(username);
    setView('private');
    setPrivateMessages([]);
    pendingHistoryFor.current = id;
    socket?.emit('chat:get_history', { receiverId: id });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !input.trim()) return;
    if (view === 'global') {
      socket.emit('chat:send', { content: input.trim() });
    } else if (selectedUserId) {
      socket.emit('chat:send', { content: input.trim(), receiverId: selectedUserId });
    }
    setInput('');
  };

  const otherOnline = onlineUsers.filter((u) => u.id !== user?.id);
  const messages = view === 'global' ? globalMessages : privateMessages;
  const canSend = view === 'global' || (view === 'private' && selectedUserId !== null);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden flex"
        style={{ height: 'calc(100vh - 9rem)' }}
      >
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="w-52 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Chat</h2>
          </div>

          <button
            onClick={() => setView('global')}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
              view === 'global'
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Globe className="w-4 h-4 flex-shrink-0" />
            Globale
          </button>

          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">
            Online ({otherOnline.length})
          </div>

          <div className="flex-1 overflow-y-auto">
            {otherOnline.length === 0 ? (
              <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-600">Nessuno online</p>
            ) : (
              otherOnline.map((u) => {
                const active = selectedUserId === u.id && view === 'private';
                return (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u.id, u.username)}
                    className={`flex items-center gap-3 px-4 py-3 w-full text-sm font-medium transition-colors text-left ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <User className="w-4 h-4" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white dark:ring-gray-900" />
                    </div>
                    <span className="truncate">{u.username}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 flex-shrink-0">
            {view === 'global' ? (
              <>
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Chat Globale</span>
              </>
            ) : (
              <>
                <div className="relative">
                  <User className="w-4 h-4 text-primary" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full ring-1 ring-white dark:ring-gray-900" />
                </div>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">{selectedUsername}</span>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {view === 'private' && !selectedUserId ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400 dark:text-gray-600">
                  Seleziona un utente per iniziare una chat privata
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400 dark:text-gray-600">Nessun messaggio ancora</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender.id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span className="text-xs text-gray-400 px-1">{msg.sender.username}</span>
                      )}
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-xs text-gray-400 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {canSend && (
            <form
              onSubmit={sendMessage}
              className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 flex-shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi un messaggio..."
                className="field"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
