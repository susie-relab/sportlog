'use client';
import { Activity, allFavouriteItems, topActivityCounts, FavouriteItem } from '@/types';

interface Props {
  favourites: string[]; // keys from user_metadata.favourite_activities
  activities: Activity[];
}

/** Compact favourites + top-5 display for Dash — the full editor lives on Profile. */
export default function FavouritesCard({ favourites, activities }: Props) {
  const allItems = allFavouriteItems();
  const favItems = favourites.map(k => allItems.find(i => i.key === k)).filter(Boolean) as FavouriteItem[];
  const { topTypes, topSubtypes } = topActivityCounts(activities, 3);

  if (favItems.length === 0 && topTypes.length === 0) return null;

  return (
    <div className="card mb-5">
      {favItems.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Favourite Activities</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
            {favItems.map(i => (
              <div key={i.key} className="text-sm text-white truncate">{i.emoji} {i.label}</div>
            ))}
          </div>
        </div>
      )}
      {(topTypes.length > 0 || topSubtypes.length > 0) && (
        <div className={`grid grid-cols-2 gap-x-4 ${favItems.length > 0 ? 'pt-3 border-t border-[#334155]' : ''}`}>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Top 5 exercise types:</p>
            <div className="flex flex-col gap-1">
              {topTypes.map(({ item, count }) => (
                <div key={item.key} className="flex items-center justify-between text-xs">
                  <span className="text-white truncate">{item.emoji} {item.label}</span>
                  <span className="text-[#64748B] flex-shrink-0 ml-2">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Top 5 session types:</p>
            <div className="flex flex-col gap-1">
              {topSubtypes.map(({ item, count }) => (
                <div key={item.key} className="flex items-center justify-between text-xs">
                  <span className="text-white truncate">{item.emoji} {item.label}</span>
                  <span className="text-[#64748B] flex-shrink-0 ml-2">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
