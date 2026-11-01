/** The meeting form uses the operator's local timezone; retain the selected time. */
export function meetingTimestamp(date: string, time: string) {
 const match=time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
 if(!match)throw new Error('Use a time such as 03:30 PM or 15:30');
 let hours=Number(match[1]);const minutes=Number(match[2]),period=match[3]?.toUpperCase();
 if(minutes>59||hours>(period?12:23)||(period&&hours<1))throw new Error('Invalid meeting time');
 if(period)hours=hours%12+(period==='PM'?12:0);
 const value=new Date(`${date}T${String(hours).padStart(2,'0')}:${match[2]}:00`);
 if(!Number.isFinite(value.getTime()))throw new Error('Invalid meeting date');
 return value.toISOString();
}
