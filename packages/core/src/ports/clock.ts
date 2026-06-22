// Port waktu agar service dapat diuji secara deterministik.
export interface ClockPort {
  now(): Date;
}

// Implementasi default berbasis jam sistem. Di-inject di composition root.
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
