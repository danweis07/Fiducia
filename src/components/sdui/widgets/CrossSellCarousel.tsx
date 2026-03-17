import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ComponentManifest } from '@/types/sdui';

interface CarouselItem {
  title: string;
  description: string;
  link: string;
  bgColor?: string;
}

export default function CrossSellCarousel({ manifest }: { manifest: ComponentManifest }) {
  const items = (manifest.props.items as CarouselItem[]) ?? [];

  if (items.length === 0) return null;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
      {items.map((item, i) => (
        <Link
          key={i}
          to={item.link}
          className="snap-start shrink-0 w-64 rounded-xl p-5 text-white transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: item.bgColor ?? '#3b82f6' }}
        >
          <h4 className="font-semibold mb-1">{item.title}</h4>
          <p className="text-sm opacity-90 mb-3">{item.description}</p>
          <span className="text-sm font-medium flex items-center gap-1">
            Learn more <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      ))}
    </div>
  );
}
