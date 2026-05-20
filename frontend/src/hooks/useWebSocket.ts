import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/useAuthStore';

interface WSMessage {
  type: string;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_title: string;
  user_id: number;
  description: string;
}

export function useWebSocket() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_BASE_URL?.replace(/^https?:\/\//, '').replace(/\/api$/, '') || 'localhost:8080';
    const wsUrl = `${protocol}//${host}/api/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);

        if (data.type === 'activity') {

          if (data.user_id !== user?.id) {
            toast(data.description, {
              icon: getActionIcon(data.action),
              duration: 3000,
              style: { fontSize: '13px' },
            });
          }


          queryClient.invalidateQueries({ queryKey: ['logs'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });

          switch (data.entity_type) {
            case 'OBJECTIVE':
              queryClient.invalidateQueries({ queryKey: ['objectives'] });
              break;
            case 'KEY_RESULT':
              queryClient.invalidateQueries({ queryKey: ['key-results'] });
              queryClient.invalidateQueries({ queryKey: ['objectives'] });
              break;
            case 'INITIATIVE':
              queryClient.invalidateQueries({ queryKey: ['initiative-tree'] });
              queryClient.invalidateQueries({ queryKey: ['key-results'] });
              queryClient.invalidateQueries({ queryKey: ['objectives'] });
              break;
            case 'SPRINT':
              queryClient.invalidateQueries({ queryKey: ['sprints'] });
              break;
          }
        }
      } catch {

      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting in 3s...');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    CREATE: '✨',
    UPDATE: '📝',
    DELETE: '🗑️',
    PROGRESS_UPDATE: '📊',
    STATUS_CHANGE: '🔄',
    ASSIGN: '👤',
    ACTIVATE: '🚀',
    COMPLETE: '✅',
  };
  return icons[action] || '🔔';
}
