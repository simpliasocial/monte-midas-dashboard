import assert from "node:assert/strict";
import createJiti from "jiti";

const jiti = createJiti(import.meta.url);
const {
    canAccessCriticalReportProfile,
    canConfigureMetaCapi,
    canConfigureMetaAds,
    canConfigureReportContext,
    canScheduleReports,
    getDefaultTab,
    getVisibleTabs,
    isAdmin,
} = jiti("../../src/domain/auth/permissions.ts");
const {
    canAccessCriticalReportProfile: canAccessCriticalReportProfileAtEdge,
} = jiti("../../supabase/functions/_shared/report-permissions.ts");

const test = (name, fn) => {
    try {
        fn();
        console.log(`ok - ${name}`);
    } catch (error) {
        console.error(`not ok - ${name}`);
        console.error(error);
        process.exitCode = 1;
    }
};

test("company and platform admins can configure report context", () => {
    assert.equal(isAdmin("platform_admin"), true);
    assert.equal(isAdmin("company_admin"), false);
    assert.equal(canConfigureReportContext("platform_admin"), true);
    assert.equal(canConfigureReportContext("company_admin"), true);
    assert.equal(canConfigureReportContext("operator"), false);
    assert.equal(canConfigureReportContext("marketing"), false);
});

test("company and platform admins can configure Meta Ads", () => {
    assert.equal(canConfigureMetaAds("platform_admin"), true);
    assert.equal(canConfigureMetaAds("company_admin"), true);
    assert.equal(canConfigureMetaAds("operator"), false);
    assert.equal(canConfigureMetaAds("marketing"), false);
});

test("only platform admins can configure Meta CAPI", () => {
    assert.equal(canConfigureMetaCapi("platform_admin"), true);
    assert.equal(canConfigureMetaCapi("company_admin"), false);
    assert.equal(canConfigureMetaCapi("operator"), false);
    assert.equal(canConfigureMetaCapi("marketing"), false);
});

test("operator sees reporting tab but only daily operations profile", () => {
    assert.deepEqual(getVisibleTabs("operator"), ["followup", "performance", "reporting"]);
    assert.equal(canAccessCriticalReportProfile("operator", "daily_operations"), true);
    assert.equal(canAccessCriticalReportProfile("operator", "management"), false);
    assert.equal(canAccessCriticalReportProfile("operator", "team_performance"), false);
    assert.equal(canAccessCriticalReportProfile("operator", "marketing_quality"), false);
});

test("marketing sees only funnel, trends, quality and reporting", () => {
    assert.deepEqual(getVisibleTabs("marketing"), ["funnel", "trends", "scoring", "reporting"]);
    assert.equal(getDefaultTab("marketing"), "funnel");
});

test("marketing sees only operations and lead-quality critical reports", () => {
    [canAccessCriticalReportProfile, canAccessCriticalReportProfileAtEdge].forEach((canAccess) => {
        assert.equal(canAccess("marketing", "daily_operations"), true);
        assert.equal(canAccess("marketing", "marketing_quality"), true);
        assert.equal(canAccess("marketing", "management"), false);
        assert.equal(canAccess("marketing", "team_performance"), false);
    });
    assert.equal(canScheduleReports("marketing"), true);
});

test("admins can access every critical report profile", () => {
    ["management", "daily_operations", "team_performance", "marketing_quality"].forEach((profileKey) => {
        assert.equal(canAccessCriticalReportProfile("platform_admin", profileKey), true);
        assert.equal(canAccessCriticalReportProfile("company_admin", profileKey), true);
    });
});
