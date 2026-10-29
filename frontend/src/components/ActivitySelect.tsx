import { ACTIVITY_LABEL } from '@/lib/format';
import { ACTIVITIES, type Activity } from '@/types';

export default function ActivitySelect({
  id, value, onChange,
}: { id: string; value: Activity; onChange: (a: Activity) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as Activity)}>
      {ACTIVITIES.map((a) => (
        <option key={a} value={a}>{ACTIVITY_LABEL[a]}</option>
      ))}
    </select>
  );
}
