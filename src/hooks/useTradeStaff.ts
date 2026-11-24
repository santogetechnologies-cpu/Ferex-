import { useEffect, useState } from 'react';
import { fetchTradeStaffOfficers, getTradeStaffOfficers, type TradeStaffOfficer } from '../lib/api/trade';

/** Trade staff for assignment lists: shows the last known list at once, then the live one from the database. */
export function useTradeStaff(): TradeStaffOfficer[] {
  const [list, setList] = useState<TradeStaffOfficer[]>(() => getTradeStaffOfficers());
  useEffect(() => {
    let live = true;
    fetchTradeStaffOfficers().then(l => { if (live) setList(l); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  return list;
}
