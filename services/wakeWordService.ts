
export class WakeWordService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onWake: () => void;

  constructor(onWake: () => void) {
    this.onWake = onWake;
    
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
        console.log("Heard:", transcript);

        if (this.checkWakeWord(transcript)) {
          this.stop();
          this.onWake();
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("Wake word error:", event.error);
        // Restart if it wasn't a manual stop
        if (this.isListening && event.error !== 'aborted') {
             setTimeout(() => this.start(), 1000);
        }
      };
      
      this.recognition.onend = () => {
          if (this.isListening) {
              this.recognition.start();
          }
      }
    }
  }

  private checkWakeWord(text: string): boolean {
    const triggers = ['prime', 'optimus', 'hey prime', 'hey optimus', 'optimus prime'];
    return triggers.some(trigger => text.includes(trigger));
  }

  public start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        console.log("Wake word listener started");
      } catch (e) {
        console.error("Failed to start wake word listener", e);
      }
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      console.log("Wake word listener stopped");
    }
  }
}
