import { PlanData, WEEKDAYS, WEEKDAY_SHORT, sessionParts } from '@/lib/runPlanGenerator';
import { sessionColor, sessionTarget } from './PlanWeekTable';

/** Compact week-by-week table for the printed/PDF plan. Plain text, no interaction —
 *  built separately from PlanWeekTable (which is optimised for on-screen browsing). */
export default function PlanPrintTable({ plan }: { plan: PlanData }) {
  return (
    <table className="plan-print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '3px 4px', border: '1px solid #ccc', width: '11%' }}>Week</th>
          {WEEKDAYS.map(d => (
            <th key={d} style={{ textAlign: 'left', padding: '3px 4px', border: '1px solid #ccc' }}>{WEEKDAY_SHORT[d]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {plan.weeks.map(w => (
          <tr key={w.weekNumber}>
            <td style={{ padding: '3px 4px', border: '1px solid #ccc', verticalAlign: 'top', fontWeight: 700 }}>
              {w.weekNumber === 0 ? 'Lead-in' : `Wk ${w.weekNumber}`}
              {w.totalKm > 0 && <div style={{ fontWeight: 400, color: '#555' }}>{w.totalKm} km</div>}
            </td>
            {WEEKDAYS.map(d => {
              const s = w.days[d];
              if (s.beforeStart) return <td key={d} style={{ border: '1px solid #ccc' }} />;
              const parts = sessionParts(s);
              return (
                <td key={d} style={{ padding: '3px 4px', border: '1px solid #ccc', verticalAlign: 'top' }}>
                  {parts.map((p, i) => (
                    <div key={i} style={{ marginBottom: i < parts.length - 1 ? 3 : 0 }}>
                      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: sessionColor(p), marginRight: 3 }} />
                      <span>{p.title}</span>
                      {sessionTarget(p) && <span style={{ color: '#555' }}> — {sessionTarget(p)}</span>}
                    </div>
                  ))}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
