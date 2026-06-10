export type ReportUserRole = "platform_admin" | "company_admin" | "marketing" | "operator" | string | null;

export const canAccessCriticalReportProfile = (role: ReportUserRole, profileKey: string): boolean => {
    if (role === "platform_admin" || role === "company_admin") return true;
    if (role === "marketing") {
        return profileKey === "daily_operations" || profileKey === "marketing_quality";
    }
    return role === "operator" && profileKey === "daily_operations";
};
