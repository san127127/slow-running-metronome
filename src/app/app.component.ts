import { ChangeDetectionStrategy, Component, computed, resource, signal } from '@angular/core';
import { clearInterval, setInterval } from 'worker-timers';

interface RhythmSegment {
  durationMinutes: number;
  bpm: number;
}

type State = 'started' | 'paused' | 'stopped' | 'finished';

const audioContext = new AudioContext();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = '超慢跑節拍器';

  startPlaySoundId = 0
  elapsedSecondsTimerId = 0;

  tickSound = resource({
    loader: async () => await fetch('tick.wav')
      .then(x => x.arrayBuffer())
      .then(buffer => audioContext.decodeAudioData(buffer))
  });

  tockSound = resource({
    loader: async () => await fetch('tock.wav')
      .then(x => x.arrayBuffer())
      .then(buffer => audioContext.decodeAudioData(buffer))
  });

  state = signal<State>('stopped');

  segments = signal<RhythmSegment[]>([
    { durationMinutes: 10, bpm: 160 },
    { durationMinutes: 30, bpm: 180 },
  ]);

  elapsedSeconds = signal(0);

  totalDurationMinutes = computed(() =>
    this.segments()
      .reduce((total, segment) => total + segment.durationMinutes, 0)
  );

  displayTime = computed(() => formatDisplayTime(this.elapsedSeconds()));

  currentSegmentIndex = computed(() => {
    let t = this.elapsedSeconds();
    for (let i = 0; i < this.segments().length; i++) {
      if (t < this.segments()[i].durationMinutes * 60) {
        return i;
      }

      t -= this.segments()[i].durationMinutes * 60;
    }

    return this.segments().length - 1;
  });

  currentBpm = computed(() => this.segments()[this.currentSegmentIndex()].bpm);

  canEditSegments = computed(() => this.state() === 'stopped' || this.state() === 'finished');

  startPlaySound() {
    const playSoundWithBpm = (bpm: number) => {
      clearInterval(this.startPlaySoundId);

      const interval = 60000 / bpm;
      let counter = 0;

      this.startPlaySoundId = setInterval(() => {
        const sound = counter % 2 === 0 ? this.tickSound.value() : this.tockSound.value();

        if (!sound) {
          return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = sound;
        source.connect(audioContext.destination);
        source.start();

        counter++;

        if (this.currentBpm() !== bpm) {
          playSoundWithBpm(this.currentBpm());
        }
      }, interval);
    }

    playSoundWithBpm(this.currentBpm());
  }

  start() {
    this.state.set('started');
    this.startPlaySound();

    this.elapsedSecondsTimerId = setInterval(() => {
      this.elapsedSeconds.update(x => x + 1);

      if (this.elapsedSeconds() >= this.totalDurationMinutes() * 60) {
        this.finish();
      }
    }, 1000);
  }

  stop() {
    this.state.set('stopped');
    this.elapsedSeconds.set(0);

    clearInterval(this.startPlaySoundId);
    clearInterval(this.elapsedSecondsTimerId);
  }

  pause() {
    this.state.set('paused');

    clearInterval(this.startPlaySoundId);
    clearInterval(this.elapsedSecondsTimerId);
  }

  finish() {
    this.state.set('finished');
    this.elapsedSeconds.set(0);

    clearInterval(this.startPlaySoundId);
    clearInterval(this.elapsedSecondsTimerId);
  }

  addSegment() {
    this.segments.update(x => [...x, { durationMinutes: 10, bpm: 150 }]);
  }

  removeSegment(index: number) {
    this.segments.update(x => x.filter((_, i) => i !== index));
  }

  updateSegment(index: number, field: 'durationMinutes' | 'bpm', event: Event) {
    const newValue = +(event.target as HTMLInputElement).value;
    this.segments.update(x => {
      const newSegments = [...x];
      newSegments[index] = {
        ...newSegments[index],
        [field]: newValue
      };

      return newSegments;
    });
  }
}

function formatDisplayTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours.toString().padStart(2, '0')}:` +
    `${minutes.toString().padStart(2, '0')}:` +
    `${seconds.toString().padStart(2, '0')}`;
}
