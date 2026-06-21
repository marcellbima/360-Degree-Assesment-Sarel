import { describe, expect, it } from 'vitest';
import {
  overallSubmissionProgressPercent,
  percent,
  questionnaireCompletionPercent,
} from './metrics';

describe('percent', () => {
  it('mengembalikan 0 ketika denominator 0', () => {
    expect(percent(10, 0)).toBe(0);
  });

  it('menghitung persentase dan membulatkan ke dua desimal', () => {
    expect(percent(48, 126)).toBe(38.1);
    expect(percent(64, 126)).toBe(50.79);
  });

  it('mengizinkan nilai melebihi 100 persen', () => {
    expect(percent(3, 2)).toBe(150);
  });
});

describe('questionnaireCompletionPercent', () => {
  it('memakai rumus completedSelf / targetParticipants', () => {
    expect(questionnaireCompletionPercent(48, 126)).toBe(38.1);
  });

  it('aman terhadap target nol', () => {
    expect(questionnaireCompletionPercent(0, 0)).toBe(0);
  });
});

describe('overallSubmissionProgressPercent', () => {
  it('berbobot berdasarkan total submission', () => {
    expect(overallSubmissionProgressPercent(319, 756)).toBe(42.2);
  });

  it('berbeda dari rata-rata persentase per tipe', () => {
    // Contoh participant: target 8, selesai 6 -> 75 persen berbobot.
    expect(overallSubmissionProgressPercent(6, 8)).toBe(75);
  });
});
