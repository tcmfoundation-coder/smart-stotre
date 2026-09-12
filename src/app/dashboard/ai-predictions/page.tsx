'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { TrendingUp, BarChart3, Calendar, Target } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Prediction {
  predictedSales: number;
  predictedRevenue: number;
  confidence: number;
}

export default function AIPredictionsPage() {
  const [productId, setProductId] = useState('');
  const [days, setDays] = useState(30);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, days }),
      });

      const data = await response.json();
      if (data.success) {
        setPrediction(data.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DashboardHeader title="AI Sales Predictions" userRole="admin" />
      
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Prediction Form */}
          <div className="bg-card rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border p-10 mb-10">
            <div className="flex items-center space-x-3 mb-8">
              <div className="h-8 w-1.5 bg-blue-600 rounded-full"></div>
              <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Predict Demand</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                  Product ID / Name
                </label>
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="Enter product unique identifier"
                  className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
                  Prediction Period
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-5 py-4 bg-muted border-none rounded-2xl focus:ring-2 focus:ring-blue-600/10 focus:bg-white dark:focus:bg-slate-800 transition-all text-foreground font-semibold outline-none appearance-none"
                >
                  <option value={7}>Next 7 Days</option>
                  <option value={14}>Next 14 Days</option>
                  <option value={30}>Next 30 Days</option>
                  <option value={60}>Next 60 Days</option>
                  <option value={90}>Next 90 Days</option>
                </select>
              </div>
            </div>
            <button
              onClick={handlePredict}
              disabled={loading || !productId}
              className="mt-10 w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center space-x-3 group disabled:opacity-50"
            >
              {loading ? (
                <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Target className="h-6 w-6 group-hover:scale-125 transition-transform" />
                  <span>GENERATE AI INSIGHTS</span>
                </>
              )}
            </button>
          </div>

          {/* Prediction Results */}
          {prediction && (
            <div className="bg-card rounded-[2.5rem] shadow-sm border border-border p-10 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center space-x-3 mb-8">
                <div className="h-8 w-1.5 bg-emerald-500 rounded-full"></div>
                <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Analysis Results</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-blue-50 dark:bg-blue-500/10 rounded-[2rem] border border-blue-100 dark:border-blue-500/20">
                  <div className="flex flex-col items-center text-center">
                    <BarChart3 className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-4" />
                    <p className="text-[11px] font-black text-blue-600/60 dark:text-blue-400/60 uppercase tracking-widest mb-1">Predicted Units</p>
                    <p className="text-3xl font-black text-foreground">{prediction.predictedSales}</p>
                  </div>
                </div>
                <div className="p-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20">
                  <div className="flex flex-col items-center text-center">
                    <TrendingUp className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-4" />
                    <p className="text-[11px] font-black text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mb-1">Forecasted Rev.</p>
                    <p className="text-3xl font-black text-foreground">{formatCurrency(prediction.predictedRevenue)}</p>
                  </div>
                </div>
                <div className="p-8 bg-purple-50 dark:bg-purple-500/10 rounded-[2rem] border border-purple-100 dark:border-purple-500/20">
                  <div className="flex flex-col items-center text-center">
                    <Target className="h-10 w-10 text-purple-600 dark:text-purple-400 mb-4" />
                    <p className="text-[11px] font-black text-purple-600/60 dark:text-purple-400/60 uppercase tracking-widest mb-1">Confidence</p>
                    <p className="text-3xl font-black text-foreground">{prediction.confidence}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card rounded-[2rem] shadow-sm border border-border p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">How It Works</h3>
              </div>
              <p className="text-muted-foreground font-medium leading-relaxed">
                Our AI analyzes historical sales data to predict future demand for your products. 
                This helps you optimize inventory levels and reduce stockouts or overstock situations.
              </p>
            </div>
            <div className="bg-card rounded-[2rem] shadow-sm border border-border p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Key Benefits</h3>
              </div>
              <ul className="text-muted-foreground font-medium space-y-3">
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span>Optimize inventory levels</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span>Reduce stockouts and overstock</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span>Improve cash flow management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span>Make data-driven decisions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
