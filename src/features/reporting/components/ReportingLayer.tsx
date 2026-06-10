import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { canAccessCriticalReportProfile } from "@/domain/auth/permissions";
import { LeadImportWizard } from "@/features/import";
import { useReportingState } from "../hooks/useReportingState";
import { CompanyContextPanel } from "./CompanyContextPanel";
import { CriticalReportProfiles } from "./CriticalReportProfiles";
import { ScheduledReportsTable } from "./ScheduledReportsTable";
import { EditScheduledReportDialog } from "./EditScheduledReportDialog";
import { type ScheduledReport } from "../domain/reportCatalog";

const ReportManagementLayer = ({ isMarketing }: { isMarketing: boolean }) => {
    const {
        reports,
        isLoading,
        fetchReports,
        toggleScheduledStatus,
        deleteScheduledReport,
        updateScheduledReport,
        refetch,
    } = useReportingState();

    const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
    const visibleReports = isMarketing
        ? reports.filter((report) => (
            Boolean(report.critical_profile_key)
            && canAccessCriticalReportProfile("marketing", report.critical_profile_key || "")
        ))
        : reports;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {!isMarketing && <LeadImportWizard onImported={refetch} />}

            {!isMarketing && <CompanyContextPanel />}

            <CriticalReportProfiles
                onScheduled={fetchReports}
            />

            <ScheduledReportsTable
                reports={visibleReports}
                onToggleStatus={toggleScheduledStatus}
                onEdit={setEditingReport}
                onDelete={deleteScheduledReport}
            />

            <EditScheduledReportDialog
                report={editingReport}
                onClose={() => setEditingReport(null)}
                onSave={updateScheduledReport}
            />

        </div>
    );
};

const ReportingLayer = () => {
    const { role } = useAuth();

    return <ReportManagementLayer isMarketing={role === "marketing"} />;
};

export default ReportingLayer;
