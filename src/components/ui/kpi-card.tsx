import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  sparkline?: number[];
  trend?: number;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  iconColor = 'text-blue-600',
  sparkline,
  trend
}: KPICardProps) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'text-emerald-600': { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
    'text-purple-600': { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/20' },
    'text-blue-600': { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
    'text-cyan-600': { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/20' },
    'text-orange-600': { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/20' },
    'text-rose-600': { bg: 'bg-rose-500/10', text: 'text-rose-600', border: 'border-rose-500/20' },
    'text-indigo-600': { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/20' },
    'text-teal-600': { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-500/20' },
  };

  const colors = colorMap[iconColor] || colorMap['text-blue-600'];

  // Format value to remove unnecessary .00
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    if (typeof val === 'string') {
      // Check if it's a currency value with .00
      if (val.includes('.00')) {
        return val.replace('.00', '');
      }
    }
    return val;
  };

  return (
    <motion.div
      className="group relative bg-card rounded-2xl p-6 border border-border shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
      whileHover={{ 
        y: -6,
        scale: 1.02,
        transition: { duration: 0.3 }
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        "pointer-events-none"
      )} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <motion.p 
            className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {title}
          </motion.p>
          
          <motion.div 
            className="flex items-baseline space-x-2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <h2 className="text-4xl font-bold text-foreground tracking-tight">
              {formatValue(value)}
            </h2>
            {trend !== undefined && (
              <motion.span
                className={cn(
                  "text-sm font-semibold",
                  trend >= 0 ? "text-success" : "text-destructive"
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {trend >= 0 ? "+" : ""}{trend}%
              </motion.span>
            )}
          </motion.div>

          {change && (
            <motion.div 
              className="flex items-center mt-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <motion.span 
                className={cn(
                  "px-3 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center border",
                  changeType === 'positive' ? "bg-success/10 text-success border-success/20" :
                  changeType === 'negative' ? "bg-destructive/10 text-destructive border-destructive/20" :
                  "bg-secondary text-muted-foreground border-border"
                )}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : '•'} {change}
              </motion.span>
            </motion.div>
          )}
        </div>

        <motion.div 
          className={cn(
            "p-4 rounded-2xl shadow-sm border",
            colors.bg,
            colors.text,
            colors.border
          )}
          whileHover={{ 
            rotate: [0, -10, 10, -10, 10, 0],
            scale: 1.15,
            transition: { duration: 0.5 }
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      </div>

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <motion.div
          className="absolute bottom-0 right-0 w-24 h-12 opacity-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          transition={{ delay: 0.5 }}
        >
          <svg
            viewBox="0 0 100 40"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d={`M0,${40 - (sparkline[0] / Math.max(...sparkline)) * 40} ` +
                sparkline.map((val, i) => 
                  `L${(i / (sparkline.length - 1)) * 100},${40 - (val / Math.max(...sparkline)) * 40}`
                ).join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={colors.text}
            />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
