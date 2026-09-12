'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Send, Sparkles, TrendingUp, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI Business Assistant powered by DeepSeek on NVIDIA. Ask me anything about your supermarket performance, inventory, sales, or business insights.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickQuestions = [
    'How is my business doing this month?',
    'What products should I restock?',
    'Which products are selling the best?',
    'How can I improve my profit margins?',
    'What are my low stock items?',
  ];

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Show detailed error message
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}${data.details ? `\n\nDetails: ${data.details}` : ''}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        setError(data.error);
      }
    } catch (_error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Network error: Unable to connect to AI service. Please check your internet connection and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  const handleRetry = () => {
    // Retry the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      // Remove the last error message if exists
      setMessages(prev => prev.filter(m => m !== prev[prev.length - 1] || m.role !== 'assistant' || !m.content.startsWith('Error')));
      handleSend(lastUserMessage.content);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="AI Business Assistant" userRole="admin" />

      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Quick Questions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Quick Questions</h3>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleQuickQuestion(question)}
                  className="px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent text-sm text-foreground"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Container */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {/* Messages */}
            <div className="h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary">AI Assistant</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-6 bg-card">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                  placeholder="Ask about your business..."
                  className="flex-1 px-6 py-4 bg-input-background border-none rounded-2xl focus:ring-2 focus:ring-ring transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={loading || !input.trim()}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Send className="h-5 w-5" />
                  <span className="font-bold">Send</span>
                </button>
                {error && (
                  <button
                    onClick={handleRetry}
                    disabled={loading}
                    className="px-6 py-4 bg-warning text-warning-foreground rounded-2xl hover:bg-warning/90 shadow-lg shadow-warning/20 transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-2"
                    title="Retry last message"
                  >
                    <RefreshCw className="h-5 w-5" />
                    <span className="font-bold">Retry</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-4">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">Sales Analysis</p>
                  <p className="text-xs text-muted-foreground">Track performance trends</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">Inventory Alerts</p>
                  <p className="text-xs text-muted-foreground">Low stock & expiry warnings</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-4">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Profit Insights</p>
                  <p className="text-xs text-muted-foreground">Revenue & expense analysis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
