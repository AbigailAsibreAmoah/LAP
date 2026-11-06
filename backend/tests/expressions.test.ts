import { DAILY_EXPRESSIONS, expressionOfDay, msUntilNextSlot, slotAt } from '@laporte/shared';
import { describe, expect, it } from 'vitest';

describe('expression du jour', () => {
  it('moves through the day every two hours', () => {
    expect(slotAt(6)).toBe('meaning'); // before 8:00 the expression itself
    expect(slotAt(8)).toBe('meaning');
    expect(slotAt(10)).toBe('everyday');
    expect(slotAt(13)).toBe('work');
    expect(slotAt(14)).toBe('watchOut');
    expect(slotAt(16)).toBe('quiz');
    expect(slotAt(19)).toBe('yourTurn');
    expect(slotAt(23)).toBe('recap');
  });
  it('knows when to change next', () => {
    expect(msUntilNextSlot(new Date(2026, 10, 6, 9, 30, 0))).toBe(30 * 60_000 + 5000); // → 10:00
    expect(msUntilNextSlot(new Date(2026, 10, 6, 21, 0, 0))).toBe(3 * 3_600_000 + 5000); // → midnight (new expression)
  });
  it('keeps the same expression all day and picks ones suited to the level', () => {
    expect(expressionOfDay('2026-11-06', 'A2').fr).toBe(expressionOfDay('2026-11-06', 'A2').fr);
    for (let d = 1; d <= 28; d++) {
      const e = expressionOfDay(`2026-11-${String(d).padStart(2, '0')}`, 'A1');
      expect(['A1', 'A2']).toContain(e.level);
    }
    for (const e of DAILY_EXPRESSIONS) expect(e.quiz.options[e.quiz.answer]).toBeTruthy();
  });
});
