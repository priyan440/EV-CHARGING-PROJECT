import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4 flex-wrap">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-emerald-500 transition-colors font-medium"
      >
        <Home size={13} />
        <span>Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-1.5">
            <ChevronRight size={12} className="text-[var(--text-muted)] shrink-0" />
            {isLast || !item.path ? (
              <span className="font-semibold text-emerald-500 truncate max-w-[180px] sm:max-w-xs">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-emerald-500 transition-colors font-medium truncate max-w-[150px] sm:max-w-xs"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
