import { motion } from "framer-motion";

export default function StatsCard({ title, value, icon: Icon, subtitle, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 border border-border shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color || "bg-primary/10"}`}>
          <Icon className={`w-5 h-5 ${color ? "text-white" : "text-primary"}`} />
        </div>
      </div>
    </motion.div>
  );
}