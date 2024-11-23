import { LogEntry } from '../types';

export interface IntervalStatus {
  hasGap: boolean;
  hasOverlap: boolean;
  gapStart?: number;
  gapEnd?: number;
  overlapStart?: number;
  overlapEnd?: number;
}

export interface IntervalValidation {
  entry: LogEntry;
  prevStatus: IntervalStatus;
  nextStatus: IntervalStatus;
}

export function validateInterval(
  entry: LogEntry,
  prevEntry: LogEntry | null,
  nextEntry: LogEntry | null
): IntervalValidation {
  const result: IntervalValidation = {
    entry,
    prevStatus: { hasGap: false, hasOverlap: false },
    nextStatus: { hasGap: false, hasOverlap: false }
  };

  // Check relationship with previous entry
  if (prevEntry) {
    if (entry.from > prevEntry.to) {
      // Gap detected
      result.prevStatus = {
        hasGap: true,
        hasOverlap: false,
        gapStart: prevEntry.to,
        gapEnd: entry.from
      };
    } else if (entry.from < prevEntry.to) {
      // Overlap detected
      result.prevStatus = {
        hasGap: false,
        hasOverlap: true,
        overlapStart: entry.from,
        overlapEnd: prevEntry.to
      };
    }
  }

  // Check relationship with next entry
  if (nextEntry) {
    if (nextEntry.from > entry.to) {
      // Gap detected
      result.nextStatus = {
        hasGap: true,
        hasOverlap: false,
        gapStart: entry.to,
        gapEnd: nextEntry.from
      };
    } else if (nextEntry.from < entry.to) {
      // Overlap detected
      result.nextStatus = {
        hasGap: false,
        hasOverlap: true,
        overlapStart: nextEntry.from,
        overlapEnd: entry.to
      };
    }
  }

  return result;
}

export function validateIntervals(entries: LogEntry[]): IntervalValidation[] {
  // Sort entries by depth
  const sortedEntries = [...entries].sort((a, b) => a.from - b.from);
  
  return sortedEntries.map((entry, index) => {
    const prevEntry = index > 0 ? sortedEntries[index - 1] : null;
    const nextEntry = index < sortedEntries.length - 1 ? sortedEntries[index + 1] : null;
    return validateInterval(entry, prevEntry, nextEntry);
  });
}

export function getIntervalColor(status: IntervalStatus): { light: string, dark: string } {
  if (status.hasOverlap) {
    return {
      light: '#ffebee', // Light red for light mode
      dark: '#4a1c1c'  // Dark red for dark mode
    };
  } else if (status.hasGap) {
    return {
      light: '#fff3e0', // Light yellow for light mode
      dark: '#3d3423'  // Dark yellow for dark mode
    };
  }
  return {
    light: 'transparent',
    dark: 'transparent'
  };
}
