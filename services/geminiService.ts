import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from "./utils";

// --- Chat & Vision ---

export const analyzeGeoPhoto = async (base64Image: string, lat: number, lng: number): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Remove data URL prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png'
            }
          },
          {
            text: `Location Coordinates: ${lat}, ${lng}.
            
            1. USE Google Maps to find the PRECISE and COMPLETE address (Street Name, Area, City, Zip Code) for these coordinates.
            2. FORMAT your response exactly as follows:
               **Address:** [Insert the full Google Maps address here]
               
               **Field Analysis:**
               [Describe the scene professionally, checking for safety hazards or maintenance issues based on the visual evidence.]`
          }
        ]
      },
      config: {
        tools: [{googleMaps: {}}]
      }
    });

    return response.text || "Analysis complete.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return "Error analyzing image. Please try again.";
  }
};

export const generateSmartReply = async (history: string, lastMessage: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional assistant in a secure enterprise chat app (OmniField Connect).
      
      Conversation History:
      ${history}
      
      Last Message: "${lastMessage}"
      
      Generate a concise, professional, and helpful response suggestion.`,
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "";
  }
};

export const generateMeetingMinutes = async (transcript: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are an expert meeting secretary. Generate professional Minutes of the Meeting (MoM) based on the following raw transcript.
        
        Structure your response exactly as follows:
        
        MINUTES OF MEETING
        ------------------
        
        1. EXECUTIVE SUMMARY
           [A brief paragraph summarizing the meeting's purpose and outcome]
        
        2. KEY DISCUSSION POINTS
           - [Point 1]
           - [Point 2]
           ...
        
        3. ACTION ITEMS
           - [Action Item] (Assigned to: [Name if clear])
        
        4. DECISIONS MADE
           - [Decision]

        ------------------
        RAW TRANSCRIPT:
        ${transcript}
      `,
    });
    return response.text || "Could not generate minutes.";
  } catch (error) {
    console.error("MoM Generation Error:", error);
    return "Error generating minutes. Please try again later.";
  }
};


// --- Live Meeting (Real-time Audio) ---

export class LiveMeetingService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private cleanupCallback: (() => void) | null = null;
  public isMuted: boolean = false;
  public isConnected: boolean = false;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  async startSession(
    onTranscriptionUpdate: (text: string, isUser: boolean) => void,
    onStatusChange: (status: string) => void
  ) {
    onStatusChange("Connecting...");
    
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const outputNode = this.outputAudioContext!.createGain();
      outputNode.connect(this.outputAudioContext!.destination);

      // Setup Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.inputAudioContext.createMediaStreamSource(stream);
      const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

      scriptProcessor.onaudioprocess = (e) => {
        if (this.isMuted || !this.isConnected) return; // Skip if muted or not connected

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (this.sessionPromise) {
          this.sessionPromise.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
          }).catch(err => {
             // Suppress abort errors that happen during disconnect
             if (!err.message?.includes('aborted')) {
                console.error("Session send error", err);
             }
          });
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(this.inputAudioContext.destination);

      // Connect to Gemini Live
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            onStatusChange("Connected");
            console.log("Gemini Live Connected");
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && this.outputAudioContext) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              
              try {
                const audioBuffer = await decodeAudioData(
                  base64ToUint8Array(base64Audio),
                  this.outputAudioContext,
                  24000,
                  1
                );
                
                const sourceNode = this.outputAudioContext.createBufferSource();
                sourceNode.buffer = audioBuffer;
                sourceNode.connect(outputNode);
                
                sourceNode.addEventListener('ended', () => {
                  this.sources.delete(sourceNode);
                });

                sourceNode.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(sourceNode);
              } catch (e) {
                console.error("Audio decode error", e);
              }
            }

            // Handle Transcriptions
            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
               onTranscriptionUpdate(message.serverContent.modelTurn.parts[0].text, false);
            }
          },
          onclose: () => {
            this.isConnected = false;
            onStatusChange("Disconnected");
          },
          onerror: (err) => {
            this.isConnected = false;
            console.error("Gemini Live Error", err);
            onStatusChange("Error: Network/API");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: "You are an AI facilitator for a field operations team meeting. Be concise, professional, and helpful."
        }
      });

      this.cleanupCallback = () => {
          this.isConnected = false;
          stream.getTracks().forEach(track => track.stop());
          scriptProcessor.disconnect();
          source.disconnect();
          this.inputAudioContext?.close();
          this.outputAudioContext?.close();
      };
    } catch (e) {
      console.error("Failed to start session:", e);
      onStatusChange("Connection Failed");
    }
  }

  async stopSession() {
    this.isConnected = false;
    if (this.cleanupCallback) {
      this.cleanupCallback();
    }
    // Only attempt to close if it exists. live.connect returns a promise that resolves to a session
    // but the SDK doesn't expose a direct 'close' on the promise itself.
    // We rely on breaking the stream and context to stop it.
    this.sessionPromise = null;
  }
}