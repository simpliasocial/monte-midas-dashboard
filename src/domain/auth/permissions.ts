import type { UserRole } from '@/context/authContextValue';

/** Tab IDs as defined in DashboardLayout */
export type TabId = 'overview' | 'funnel' | 'operational' | 'followup' 
  | 'performance' | 'trends' | 'scoring' | 'chats' | 'reporting';

const ALL_TABS: TabId[] = [
  'overview', 'funnel', 'operational', 'followup', 
  'performance', 'trends', 'scoring', 'chats', 'reporting',
];

const OPERATOR_TABS: TabId[] = ['followup', 'performance', 'reporting'];
const MARKETING_TABS: TabId[] = ['funnel', 'trends', 'scoring', 'reporting'];

/** Returns the tabs visible for a given role */
export function getVisibleTabs(role: UserRole | null): TabId[] {
  if (!role) return [];
  if (role === 'operator') return OPERATOR_TABS;
  if (role === 'marketing') return MARKETING_TABS;
  return ALL_TABS;
}

/** Returns the default landing tab for a role */
export function getDefaultTab(role: UserRole | null): TabId {
  if (role === 'operator') return 'followup';
  if (role === 'marketing') return 'funnel';
  return 'overview';
}

/** Whether the role can access admin-level features (tag config, etc.) */
export function isAdmin(role: string | null): boolean {
  return role === 'platform_admin';
}

export function canConfigureReportContext(role: string | null): boolean {
  return role === 'platform_admin' || role === 'company_admin';
}

export function canConfigureMetaAds(role: string | null): boolean {
  return role === 'platform_admin' || role === 'company_admin';
}

export function canConfigureMetaCapi(role: string | null): boolean {
  return role === 'platform_admin';
}

export function canAccessCriticalReportProfile(
  role: string | null,
  profileKey: string,
): boolean {
  if (role === 'platform_admin' || role === 'company_admin') return true;
  if (role === 'marketing') {
    return profileKey === 'daily_operations' || profileKey === 'marketing_quality';
  }
  return role === 'operator' && profileKey === 'daily_operations';
}

export function canScheduleReports(role: string | null): boolean {
  return role === 'platform_admin'
    || role === 'company_admin'
    || role === 'marketing'
    || role === 'operator';
}
