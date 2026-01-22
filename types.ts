
export enum AppMode {
  CHAT = 'CHAT',
  MEETING = 'MEETING'
}

export interface GeoLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'colleague';
  text: string;
  timestamp: Date;
  senderName?: string;
  image?: string; // base64
  audio?: string; // base64
  poll?: PollData;
  location?: GeoLocationData;
  isEncrypted?: boolean;
  centreCode?: string; // Added for Report Mode
}

export interface UserProfile {
  name?: string;
  avatar?: string;
  about?: string;
  mobile: string;
  email: string; // Added email field
  idProofType: 'Aadhaar' | 'PAN';
  idProofImage: string; // base64 or url
  registeredAt: Date;
}

export interface GroupSettings {
    editInfo: 'everyone' | 'admins';
    sendMessages: 'everyone' | 'admins';
}

export interface GroupMetadata {
    description: string;
    createdBy: string;
    createdAt: Date;
    participants: string[]; // User IDs (contacts + 'user')
    admins: string[]; // User IDs
    settings: GroupSettings;
}

export interface ChatSession {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: Date;
  unread: number;
  avatar: string;
  messages: Message[];
  type: 'direct' | 'group' | 'channel' | 'broadcast';
  isVerified?: boolean;
  isPinned?: boolean;
  contactProfile?: UserProfile; // For DMs, the other user's full profile
  groupMetadata?: GroupMetadata; // For Groups/Channels
}

export interface NetworkDownloadSettings {
  photos: boolean;
  audio: boolean;
  videos: boolean;
  documents: boolean;
}

export interface AppSettings {
  biometricEnabled: boolean;
  autoLockTimer: number; // minutes
  dataRetentionDays: number;
  locationPrecision: 'high' | 'approximate';
  mediaAutoDownload: {
    mobileData: NetworkDownloadSettings;
    wifi: NetworkDownloadSettings;
    roaming: NetworkDownloadSettings;
  };
}

export interface CameraOverlayConfig {
  showMap: boolean;
  showCoords: boolean;
  showDate: boolean;
  notes: string;
}