import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, deleteFriendRequest } from '../lib/api';
import type { FriendUser, FriendRequest } from '../types';

interface FriendsContextType {
  friends: FriendUser[];
  friendIds: Set<number>;
  pendingRequests: FriendRequest[];
  loading: boolean;
  refresh: () => Promise<void>;
  addFriend: (userId: number) => Promise<void>;
  accept: (requestId: number) => Promise<void>;
  remove: (requestId: number) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType>({
  friends: [],
  friendIds: new Set(),
  pendingRequests: [],
  loading: false,
  refresh: async () => {},
  addFriend: async () => {},
  accept: async () => {},
  remove: async () => {},
});

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [f, r] = await Promise.all([getFriends(), getFriendRequests()]);
      setFriends(f);
      setPendingRequests(r);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) refresh();
  }, [user?.id, refresh]);

  // Real-time: server emits "friend:update" when a request arrives or is accepted
  useEffect(() => {
    if (!socket) return;
    socket.on('friend:update', refresh);
    return () => { socket.off('friend:update', refresh); };
  }, [socket, refresh]);

  const addFriend = useCallback(async (userId: number) => {
    await sendFriendRequest(userId);
    await refresh();
  }, [refresh]);

  const accept = useCallback(async (requestId: number) => {
    await acceptFriendRequest(requestId);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (requestId: number) => {
    await deleteFriendRequest(requestId);
    await refresh();
  }, [refresh]);

  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <FriendsContext.Provider value={{ friends, friendIds, pendingRequests, loading, refresh, addFriend, accept, remove }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  return useContext(FriendsContext);
}
