'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { Send, Sparkles, TrendingUp, AlertTriangle, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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

      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Quick Questions */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-foreground">Quick Questions</h3>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  onClick={() => handleQuickQuestion(question)}
                  className="rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Container */}
          <Card className="overflow-hidden">
            {/* Messages */}
            <div className="h-[500px] space-y-4 overflow-y-auto p-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary">AI Assistant</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                    <p className="mt-2 text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0.1s' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                  placeholder="Ask about your business..."
                  className="h-11 flex-1"
                  disabled={loading}
                />
                <Button onClick={() => handleSend(input)} disabled={loading || !input.trim()} className="h-11 gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
                {error && (
                  <Button
                    variant="outline"
                    onClick={handleRetry}
                    disabled={loading}
                    className="h-11 gap-2 text-warning hover:text-warning"
                    title="Retry last message"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Info Cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-7 w-7 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">Sales Analysis</p>
                  <p className="text-xs text-muted-foreground">Track performance trends</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-7 w-7 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">Inventory Alerts</p>
                  <p className="text-xs text-muted-foreground">Low stock & expiry warnings</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <DollarSign className="h-7 w-7 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Profit Insights</p>
                  <p className="text-xs text-muted-foreground">Revenue & expense analysis</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
