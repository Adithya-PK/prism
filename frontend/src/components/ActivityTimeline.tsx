import React from 'react';
import { Terminal, Clock, Activity } from 'lucide-react';
import { ActivityItem } from '../types';

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  return (
    <div className="card-prism">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-prism-purple-bright" />
          <h3 className="text-sm font-semibold text-white">PRISM ACTIVITY TIMELINE</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AUTONOMOUS ENGINE</span>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
        {activities.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-[11px]">
            Waiting for activity events...
          </div>
        ) : (
          activities.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-1.5 rounded bg-surface-secondary/40 border border-border/30 hover:border-border transition-colors text-[11px]"
            >
              <span className="text-slate-500 font-mono text-[10px] flex-shrink-0 mt-0.5">
                {item.time}
              </span>
              <span className="text-slate-300">
                {item.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
