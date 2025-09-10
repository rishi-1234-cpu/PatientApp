// src/Services/analyticsServices.ts
import api from '../api';

// --- types ---
export type KPIResponse = {
    totalPatients: number;
    admittedToday: number;
    dischargedToday: number;
    bedOccupancyPct: number | null; // we don't have beds data yet
    revenueToday: number;
};

export type TrendPoint = { date: string; count: number };

// --- helpers ---
const toISODate = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
        .toISOString()
        .slice(0, 10);

const todayUtc = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// --- API wrappers ---

/** GET /api/admin/stats/total-patients -> { total } */
export async function getTotalPatients(): Promise<number> {
    const res = await api.get('/admin/stats/total-patients');
    return Number(res.data?.total ?? 0);
}

/** GET /api/admin/stats/admissions?from&to -> { range, items:[{date,count}] } */
export async function getAdmissions(from: Date, to: Date): Promise<TrendPoint[]> {
    const res = await api.get('/admin/stats/admissions', {
        params: { from: toISODate(from), to: toISODate(to) },
    });
    return (res.data?.items ?? []) as TrendPoint[];
}

/** GET /api/admin/stats/discharge-billing?from&to
* -> { range, discharges:[{date,count}], billing:[{date,totalAmount,paid,pending,cancelled}] }
*/
export async function getDischargeBilling(
    from: Date,
    to: Date,
): Promise<{
    discharges: TrendPoint[];
    billing: { date: string; totalAmount: number; paid: number; pending: number; cancelled: number }[];
}> {
    const res = await api.get('/admin/stats/discharge-billing', {
        params: { from: toISODate(from), to: toISODate(to) },
    });
    return {
        discharges: (res.data?.discharges ?? []) as TrendPoint[],
        billing: (res.data?.billing ?? []) as any[],
    };
}

/** Dashboard KPIs composed from the above endpoints */
export async function getKpis(): Promise<KPIResponse> {
    const end = todayUtc(); // exclusive end for range endpoints
    const start7 = new Date(end); start7.setUTCDate(start7.getUTCDate() - 7);
    const start1 = new Date(end); start1.setUTCDate(start1.getUTCDate() - 1); // “today” window
    const todayISO = toISODate(start1);

    const [total, admissions, dischargeBilling] = await Promise.all([
        getTotalPatients(),
        getAdmissions(start1, end),
        getDischargeBilling(start1, end),
    ]);

    const admittedToday =
        admissions.find((x) => x.date === todayISO)?.count ?? 0;

    const dischargedToday =
        dischargeBilling.discharges.find((x) => x.date === todayISO)?.count ?? 0;

    const revenueToday =
        dischargeBilling.billing.find((x) => x.date === todayISO)?.paid ?? 0;

    return {
        totalPatients: total,
        admittedToday,
        dischargedToday,
        bedOccupancyPct: null, // not available yet
        revenueToday,
    };
}

/** Admissions trend for the last `days` (default 7) */
export async function getAdmissionsTrend(days = 7): Promise<TrendPoint[]> {
    const end = todayUtc();
    const from = new Date(end);
    from.setUTCDate(from.getUTCDate() - days);
    const items = await getAdmissions(from, end);

    // Ensure zero-filled contiguous dates
    const map = new Map(items.map((i) => [i.date, i.count]));
    const out: TrendPoint[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(from);
        d.setUTCDate(from.getUTCDate() + i);
        const key = toISODate(d);
        out.push({ date: key, count: map.get(key) ?? 0 });
    }
    return out;
}
