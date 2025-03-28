import { Component, computed, signal } from '@angular/core';

interface RhythmSegment {
  durationMinutes: number;
  bpm: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = '超慢跑節拍器';
  isPlaying = false;
  isPaused = false;
  currentBpm = 60;
  audioContext: AudioContext;
  timer: any;
  beatSound?: AudioBuffer;
  isLoading = true;
  currentSegmentIndex = 0;
  segmentElapsedTime = 0;

  segments = signal<RhythmSegment[]>([
    { durationMinutes: 10, bpm: 150 },
    { durationMinutes: 20, bpm: 170 }
  ]);
  totalDurationMinutes = computed(() =>
    this.segments()
      .reduce((total, segment) => total + segment.durationMinutes, 0)
  );

  elapsedSeconds = signal(0);
  displayTime = computed(() => formatDisplayTime(this.elapsedSeconds()));

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.loadSound();
  }

  async loadSound() {
    try {
      const response = await fetch('assets/metronome.wav');
      const arrayBuffer = await response.arrayBuffer();
      this.beatSound = await this.audioContext.decodeAudioData(arrayBuffer);
      this.isLoading = false;
    } catch (error) {
      console.error('加載音效失敗:', error);
      this.isLoading = false;
    }
  }

  playBeat() {
    if (!this.beatSound) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.beatSound;
    source.connect(this.audioContext.destination);
    source.start();
  }

  toggleMetronome() {
    if (this.isPlaying) {
      this.pauseMetronome();
    } else {
      this.startMetronome();
    }
  }

  startMetronome() {
    if (this.isPlaying && !this.isPaused) return;

    if (this.isPaused) {
      // 從暫停恢復
      this.isPaused = false;
    } else {
      // 全新開始
      this.currentSegmentIndex = 0;
      this.elapsedSeconds.set(0);
      this.segmentElapsedTime = 0;
      this.currentBpm = this.segments()[0].bpm;
    }

    this.isPlaying = true;
    this.updateMetronome();
  }

  pauseMetronome() {
    this.isPlaying = false;
    this.isPaused = true;
    clearInterval(this.timer);
  }

  stopMetronome() {
    this.isPlaying = false;
    this.isPaused = false;
    clearInterval(this.timer);
    this.currentSegmentIndex = 0;
    this.elapsedSeconds.set(0);
    this.segmentElapsedTime = 0;
  }

  updateMetronome() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const updateInterval = 100; // 100毫秒更新一次時間
    const beatInterval = 60000 / this.currentBpm; // 節拍間隔(毫秒)
    let lastBeatTime = 0;

    this.timer = setInterval(() => {
      if (!this.isPlaying) return;

      // 更新時間
      this.elapsedSeconds.update(x => x + updateInterval / 1000);
      this.segmentElapsedTime += updateInterval / 1000;

      // 檢查是否需要切換到下一段
      const currentSegment = this.segments()[this.currentSegmentIndex];
      if (this.segmentElapsedTime >= currentSegment.durationMinutes) {
        this.segmentElapsedTime = 0;
        this.currentSegmentIndex++;

        if (this.currentSegmentIndex >= this.segments.length) {
          this.stopMetronome();
          return;
        }

        this.currentBpm = this.segments()[this.currentSegmentIndex].bpm;
        lastBeatTime = 0; // 重置節拍計時
      }

      // 播放節拍
      if (this.elapsedSeconds() * 1000 - lastBeatTime >= beatInterval) {
        this.playBeat();
        lastBeatTime = this.elapsedSeconds() * 1000;
      }
    }, updateInterval);
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
