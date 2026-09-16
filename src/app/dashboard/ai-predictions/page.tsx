'use client';

import { useState } from 'react';
import { DashboardHeader } from '@/components/dashboard-header';
import { TrendingUp, BarChart3, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <div className="min-h-screen bg-background">
      <DashboardHeader title="AI Sales Predictions" userRole="admin" />

      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Prediction Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-6 text-base font-semibold text-foreground">Predict Demand</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="predict-product">Product ID / Name</Label>
                  <Input
                    id="predict-product"
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="Enter product unique identifier"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="predict-period">Prediction Period</Label>
                  <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
                    <SelectTrigger id="predict-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Next 7 Days</SelectItem>
                      <SelectItem value="14">Next 14 Days</SelectItem>
                      <SelectItem value="30">Next 30 Days</SelectItem>
                      <SelectItem value="60">Next 60 Days</SelectItem>
                      <SelectItem value="90">Next 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handlePredict}
                disabled={loading || !productId}
                isLoading={loading}
                className="mt-6 w-full gap-2"
              >
                {!loading && (
                  <>
                    <Target className="h-4 w-4" />
                    Generate AI Insights
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Prediction Results */}
          {prediction && (
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-6 text-base font-semibold text-foreground">Analysis Results</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="rounded-md bg-info/10 p-6 text-center">
                    <BarChart3 className="mx-auto mb-3 h-8 w-8 text-info" />
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-info/70">Predicted Units</p>
                    <p className="text-2xl font-semibold text-foreground">{prediction.predictedSales}</p>
                  </div>
                  <div className="rounded-md bg-success/10 p-6 text-center">
                    <TrendingUp className="mx-auto mb-3 h-8 w-8 text-success" />
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-success/70">Forecasted Rev.</p>
                    <p className="text-2xl font-semibold text-foreground">{formatCurrency(prediction.predictedRevenue)}</p>
                  </div>
                  <div className="rounded-md bg-primary/10 p-6 text-center">
                    <Target className="mx-auto mb-3 h-8 w-8 text-primary" />
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary/70">Confidence</p>
                    <p className="text-2xl font-semibold text-foreground">{prediction.confidence}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-md bg-info/10 p-2.5">
                    <Calendar className="h-5 w-5 text-info" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">How It Works</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Our AI analyzes historical sales data to predict future demand for your products.
                  This helps you optimize inventory levels and reduce stockouts or overstock situations.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-md bg-success/10 p-2.5">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">Key Benefits</h3>
                </div>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>Optimize inventory levels</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>Reduce stockouts and overstock</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>Improve cash flow management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span>Make data-driven decisions</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
