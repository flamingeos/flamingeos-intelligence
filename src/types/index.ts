import type { User, YoutubeChannel, Competitor, Video, AgentRun } from "@prisma/client";

export type { User, YoutubeChannel, Competitor, Video, AgentRun };

export interface DashboardStats {
  subscribers: bigint;
  totalViews: bigint;
  videoCount: number;
  watchTimeMinutes: number;
  estimatedRevenue: number;
  averageRpm: number;
  averageCtr: number;
  subscriberDelta: number;
  viewsDelta: number;
  revenueDelta: number;
}

export interface VideoWithMetrics extends Video {
  metrics: {
    date: Date;
    viewCount: bigint;
    watchTimeMinutes: number | null;
    ctr: number | null;
    estimatedRevenue: number | null;
  }[];
}

export interface CompetitorWithVideos extends Competitor {
  videos: {
    videoId: string;
    title: string;
    publishedAt: Date;
    viewCount: bigint;
    viewVelocity: number | null;
    analyzed: boolean;
  }[];
  _count: { videos: number };
}

export interface TrendWithScores {
  id: string;
  topic: string;
  source: string;
  overallScore: number | null;
  velocityScore: number | null;
  opportunityScore: number | null;
  relevanceScore: number | null;
  summary: string | null;
  viralAngles: string[];
  status: string;
  alertSent: boolean;
  createdAt: Date;
}

export interface AgentRunSummary {
  id: string;
  agentType: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  tokensUsed: number | null;
  confidenceScore: number | null;
  error: string | null;
}

export interface TitleOption {
  title: string;
  curiosityScore: number;
  emotionScore: number;
  clarityScore: number;
  searchabilityScore: number;
  ctrPrediction: number;
  overallScore: number;
  reasoning: string;
}

export interface ThumbnailConcept {
  visualDescription: string;
  subjectPlacement: string;
  textPlacement: string;
  colorPsychology: string;
  emotionalTrigger: string;
  predictedCtr: number;
  dallePrompt: string;
  reasoning: string;
}

export interface ContentCalendarEntry {
  id: string;
  scheduledDate: Date;
  title: string;
  topic: string | null;
  scriptType: string | null;
  status: string;
  priority: number;
  notes: string | null;
}

export type Period = "day" | "week" | "month" | "year";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: string | number;
}
