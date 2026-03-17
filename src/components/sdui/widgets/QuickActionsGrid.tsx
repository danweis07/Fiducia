import { Link } from 'react-router-dom';
import { Send, Receipt, Camera, CreditCard, MapPin, Landmark, PiggyBank, ArrowRightLeft } from 'lucide-react';
import type { ComponentManifest } from '@/types/sdui';

const iconMap: Record<string, React.ElementType> = {
  send: Send, receipt: Receipt, camera: Camera, credit_card: CreditCard,
  map_pin: MapPin, landmark: Landmark, piggy_bank: PiggyBank, transfer: ArrowRightLeft,
};

interface QuickAction {
  label: string;
  icon: string;
  color: string;
  to: string;
}

export default function QuickActionsGrid({ manifest }: { manifest: ComponentManifest }) {
  const actions = (manifest.props.actions as QuickAction[]) ?? [];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {actions.map((action) => {
        const Icon = iconMap[action.icon] ?? Send;
        return (
          <Link
            key={action.to}
            to={action.to}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white border hover:shadow-md transition-shadow"
          >
            <div className="p-2.5 rounded-full" style={{ backgroundColor: action.color + '15', color: action.color }}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-slate-700 text-center">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
