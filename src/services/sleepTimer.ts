import { SoundEngine } from './soundEngine';

type TimerCallback = (remainingSeconds: number) => void;
type CompletionCallback = () => void;

class SleepTimerManager {
  private timerId: NodeJS.Timeout | null = null;
  private remainingSeconds: number = 0;
  private onTickCallback: TimerCallback | null = null;
  private onCompleteCallback: CompletionCallback | null = null;

  /**
   * Starts a sleep timer for the given minutes.
   */
  startTimer(
    minutes: number,
    onTick?: TimerCallback,
    onComplete?: CompletionCallback
  ): void {
    this.stopTimer();

    this.remainingSeconds = minutes * 60;
    this.onTickCallback = onTick || null;
    this.onCompleteCallback = onComplete || null;

    this.onTickCallback?.(this.remainingSeconds);

    this.timerId = setInterval(async () => {
      this.remainingSeconds -= 1;

      if (this.remainingSeconds <= 0) {
        this.stopTimer();
        // Fade out sounds smoothly over 4 seconds so the user isn't startled awake
        await SoundEngine.fadeOutAll(4000);
        this.onCompleteCallback?.();
      } else {
        this.onTickCallback?.(this.remainingSeconds);
      }
    }, 1000);
  }

  /**
   * Stops and cancels the active sleep timer.
   */
  stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.remainingSeconds = 0;
    this.onTickCallback?.(0);
  }

  getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  isRunning(): boolean {
    return this.timerId !== null;
  }

  /**
   * Formats remaining seconds as MM:SS.
   */
  formatTime(): string {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export const SleepTimer = new SleepTimerManager();

