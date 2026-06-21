// Fungsi murni perhitungan metrik dashboard.
// Tidak boleh bergantung pada infrastruktur apa pun.

/**
 * Persentase aman terhadap pembagian nol.
 * Mengembalikan 0 ketika denominator 0, dibulatkan ke dua desimal.
 * Nilai boleh melebihi 100 ketika numerator melebihi denominator.
 */
export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  const value = (numerator / denominator) * 100;
  return Math.round(value * 100) / 100;
}

/**
 * questionnaireCompletionPercent =
 * completedSelfParticipants / targetParticipants * 100
 */
export function questionnaireCompletionPercent(
  completedSelfParticipants: number,
  targetParticipants: number,
): number {
  return percent(completedSelfParticipants, targetParticipants);
}

/**
 * overallSubmissionProgressPercent =
 * totalCompletedSubmissions / totalTargetSubmissions * 100
 * Berbobot, bukan rata-rata persentase per tipe.
 */
export function overallSubmissionProgressPercent(
  totalCompletedSubmissions: number,
  totalTargetSubmissions: number,
): number {
  return percent(totalCompletedSubmissions, totalTargetSubmissions);
}
