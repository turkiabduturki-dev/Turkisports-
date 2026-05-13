export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  image?: string;
  date: string;
  source: string;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  time: string;
  status: 'LIVE' | 'FINISHED' | 'UPCOMING';
  competition: string;
  homeLogo?: string;
  awayLogo?: string;
}

export interface PlayerStats {
  name: string;
  goals: number;
  assists: number;
  team: string;
  rating: number;
}
