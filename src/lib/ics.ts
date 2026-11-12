import { CampaignEvent } from './campaigns';

const utc = (value: string | Date) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');

/** Fold by UTF-8 octets without splitting a Unicode character. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  let result = '', width = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (width + bytes > 75) { result += '\r\n '; width = 1; }
    result += char;
    width += bytes;
  }
  return result;
}

export function buildIcs(event: CampaignEvent, campaignName: string): string {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mord Hive//Campaign Events//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${event.id}@hive.mordheimmanager.net`, `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(event.starts_at)}`,
    `DTEND:${utc(event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 3 * 3600000))}`,
    `SUMMARY:${escapeText(`${campaignName}: ${event.title}`)}`,
    `LOCATION:${escapeText(event.location)}`, `DESCRIPTION:${escapeText(event.notes)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
