import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { useErrorHandler } from "@/hooks/useErrorHandler";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { handleError } = useErrorHandler();

  const sendMutation = useMutation({
    mutationFn: (message: string) =>
      gateway.ai.chat({
        message,
        conversationHistory: messages
          .filter((m) => !m.isLoading)
          .map((m) => ({ role: m.role, content: m.content })),
        sessionId: sessionId ?? undefined,
      }),
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat({
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.reply,
            timestamp: new Date(),
          }),
      );
    },
    onError: (err) => {
      setMessages((prev) => prev.filter((m) => !m.isLoading));
      handleError(err, { fallbackTitle: "Chat unavailable" });
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      // Add user message + loading placeholder
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: content.trim(),
          timestamp: new Date(),
        },
        {
          id: "loading",
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isLoading: true,
        },
      ]);

      sendMutation.mutate(content.trim());
    },
    [sendMutation],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearChat,
    isLoading: sendMutation.isPending,
    sessionId,
  };
}
