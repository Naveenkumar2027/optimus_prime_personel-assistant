import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { float32ToPCM16, arrayBufferToBase64, decodeAudioData, base64ToUint8Array } from "../utils/audioUtils";

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

// Define Tools

const playMusicTool: FunctionDeclaration = {
  name: 'play_music',
  description: 'Play a specific song, artist, or video on the main screen. This will assume control of the display to show the video player.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The song name, artist, or video title to search for' }
    },
    required: ['query']
  }
};

const showLocationTool: FunctionDeclaration = {
  name: 'show_location',
  description: 'Display a map for a specific location, city, or place on the main screen.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING, description: 'The location query (e.g., "New York", "Eiffel Tower", "Nearby Pizza")' }
    },
    required: ['location']
  }
};

const openWebsiteTool: FunctionDeclaration = {
  name: 'open_website',
  description: 'Open a specific website, web page, or web application in a new browser tab. Use this for general browsing requests outside of music or maps.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: 'The full URL to open (e.g., https://www.facebook.com)' },
      siteName: { type: Type.STRING, description: 'The name of the site being opened' }
    },
    required: ['url']
  }
};

const takePictureTool: FunctionDeclaration = {
  name: 'take_picture',
  description: 'Take a picture using the user\'s camera. Use this when the user says "click my picture" or "take a selfie".',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

const toggleBluetoothTool: FunctionDeclaration = {
  name: 'scan_bluetooth',
  description: 'Scan for and connect to nearby Bluetooth devices.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  }
};

const setVolumeTool: FunctionDeclaration = {
  name: 'set_volume',
  description: 'Set the assistant volume level. Range 0 to 100.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      level: { type: Type.NUMBER, description: 'Volume level from 0 to 100' }
    },
    required: ['level']
  }
};

interface LiveServiceCallbacks {
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: Error) => void;
  onAudioOutput: (analyser: AnalyserNode) => void; 
  onAudioInput: (analyser: AnalyserNode) => void;
  onToolCall: (name: string, args: any) => Promise<any>;
}

export class LiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputGain: GainNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private nextStartTime: number = 0;
  private stream: MediaStream | null = null;
  private isConnected: boolean = false;
  
  constructor(private callbacks: LiveServiceCallbacks) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async connect() {
    if (this.isConnected) return;

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Output Audio Chain
      this.outputGain = this.outputAudioContext.createGain();
      this.outputAnalyser = this.outputAudioContext.createAnalyser();
      this.outputAnalyser.fftSize = 256;
      this.outputGain.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.outputAudioContext.destination);
      
      this.callbacks.onAudioOutput(this.outputAnalyser);

      // Input Audio Chain (Mic)
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.inputAnalyser = this.inputAudioContext.createAnalyser();
      this.inputAnalyser.fftSize = 256;
      this.inputSource.connect(this.inputAnalyser);
      
      this.callbacks.onAudioInput(this.inputAnalyser);

      const config = {
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } 
          },
          systemInstruction: `You are Optimus Prime, leader of the Autobots. 
          You are currently functioning as a personal AI assistant named "Prime". 
          Your voice is deep, authoritative, noble, and somewhat robotic. 
          
          CAPABILITIES & TOOLS:
          1. **Play Music**: When asked to play music, a song, or a video, YOU MUST use the \`play_music\` tool with the query. Do not just say you will play it.
          2. **Maps**: When asked for location, directions, or "where is...", YOU MUST use the \`show_location\` tool.
          3. **Web**: Use \`open_website\` for other sites.
          4. **Device**: \`take_picture\`, \`scan_bluetooth\`, \`set_volume\`.
          
          Address the user as "Friend" or "Human". 
          Keep responses concise.
          Do NOT explicitly mention "I am executing the tool", just confirm the action like "Engaging audio systems" or "Displaying coordinates".`,
          tools: [
            { functionDeclarations: [playMusicTool, showLocationTool, openWebsiteTool, takePictureTool, toggleBluetoothTool, setVolumeTool] }
          ]
        }
      };

      const sessionPromise = this.ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            this.isConnected = true;
            this.callbacks.onConnect();
            this.startAudioInput(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message, sessionPromise);
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            this.cleanup();
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            this.callbacks.onError(new Error("Network error"));
            this.cleanup();
          }
        }
      });
      
    } catch (error) {
      console.error("Failed to connect:", error);
      this.callbacks.onError(error instanceof Error ? error : new Error("Unknown error"));
      this.cleanup();
    }
  }

  private startAudioInput(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.inputSource) return;

    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToPCM16(inputData);
      const base64Data = arrayBufferToBase64(pcm16.buffer);

      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data
          }
        });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // Handle Audio
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext && this.outputGain) {
      const pcmData = base64ToUint8Array(audioData);
      const buffer = await decodeAudioData(pcmData, this.outputAudioContext, 24000, 1);
      
      this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputGain);
      source.start(this.nextStartTime);
      this.nextStartTime += buffer.duration;
    }

    // Handle Tool Calls
    const toolCall = message.toolCall;
    if (toolCall) {
      for (const fc of toolCall.functionCalls) {
        console.log("Tool Call Received:", fc.name, fc.args);
        let result: Record<string, any> = { result: 'ok' };
        try {
            const output = await this.callbacks.onToolCall(fc.name, fc.args);
            if(output) result = output;
        } catch (e) {
            console.error("Tool execution failed", e);
            result = { result: 'error', error: String(e) };
        }

        // Send response back
        sessionPromise.then(session => {
          session.sendToolResponse({
            functionResponses: {
              id: fc.id,
              name: fc.name,
              response: result
            }
          });
        });
      }
    }
    
    // Handle Interruption
    if (message.serverContent?.interrupted) {
        if (this.outputAudioContext) {
            this.nextStartTime = this.outputAudioContext.currentTime;
        }
    }
  }

  public setVolume(level: number) {
    if (this.outputGain) {
      this.outputGain.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  public disconnect() {
    this.cleanup();
  }

  private cleanup() {
    this.isConnected = false;
    this.callbacks.onDisconnect();

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.inputAnalyser) {
        this.inputAnalyser.disconnect();
        this.inputAnalyser = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }
}