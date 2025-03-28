import { Component } from '@angular/core';

interface RhythmSegment {
  duration: number; // 分鐘
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
  segments: RhythmSegment[] = [
    { duration: 10, bpm: 150 },
    { duration: 20, bpm: 170 }
  ];
  audioContext: AudioContext;
  timer: any;
  beatSound?: AudioBuffer;
  isLoading = true;
  currentSegmentIndex = 0;
  elapsedTime = 0; // 秒
  segmentElapsedTime = 0; // 當前段已進行時間(秒)
  totalDuration = 0; // 總時長(秒)
  displayTime = '00:00:00';

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.loadSound();
    this.calculateTotalDuration();
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
      this.elapsedTime = 0;
      this.segmentElapsedTime = 0;
      this.currentBpm = this.segments[0].bpm;
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
    this.elapsedTime = 0;
    this.segmentElapsedTime = 0;
    this.displayTime = '00:00:00';
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
      this.elapsedTime += updateInterval / 1000;
      this.segmentElapsedTime += updateInterval / 1000;
      this.updateDisplayTime();

      // 檢查是否需要切換到下一段
      const currentSegment = this.segments[this.currentSegmentIndex];
      if (this.segmentElapsedTime >= currentSegment.duration * 60) {
        this.segmentElapsedTime = 0;
        this.currentSegmentIndex++;

        if (this.currentSegmentIndex >= this.segments.length) {
          this.stopMetronome();
          return;
        }

        this.currentBpm = this.segments[this.currentSegmentIndex].bpm;
        lastBeatTime = 0; // 重置節拍計時
      }

      // 播放節拍
      if (this.elapsedTime * 1000 - lastBeatTime >= beatInterval) {
        this.playBeat();
        lastBeatTime = this.elapsedTime * 1000;
      }
    }, updateInterval);
  }

  updateDisplayTime() {
    const hours = Math.floor(this.elapsedTime / 3600);
    const minutes = Math.floor((this.elapsedTime % 3600) / 60);
    const seconds = Math.floor(this.elapsedTime % 60);

    this.displayTime =
      `${hours.toString().padStart(2, '0')}:` +
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`;
  }

  addSegment() {
    this.segments.push({ duration: 5, bpm: 60 });
    this.calculateTotalDuration();
  }

  removeSegment(index: number) {
    this.segments.splice(index, 1);
    this.calculateTotalDuration();
  }

  updateSegment(index: number, field: 'duration' | 'bpm', value: number) {
    this.segments[index][field] = value;
    this.calculateTotalDuration();
  }

  calculateTotalDuration() {
    this.totalDuration = this.segments.reduce((total, segment) => total + segment.duration * 60, 0);
  }

  formatTime(minutes: number): string {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}小時${mins}分鐘` : `${mins}分鐘`;
  }
}
