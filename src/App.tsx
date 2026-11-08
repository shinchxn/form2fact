import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ViewType } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { ApplicationsView } from './components/ApplicationsView.tsx';
import { ApplicationDetailView } from './components/ApplicationDetailView.tsx';
import { DocumentReviewView } from './components/DocumentReviewView.tsx';
import { FindingsView } from './components/FindingsView.tsx';
import { RulesView } from './components/RulesView.tsx';
import { AictePreviewView } from './components/AictePreviewView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AnnotationWorkbenchView } from './components/AnnotationWorkbenchView.tsx';
import { NewApplicationModal } from './components/NewApplicationModal.tsx';
import { CorrectionModal } from './components/CorrectionModal.tsx';
import { ReviewActionModal } from './components/ReviewActionModal.tsx';
import { ErrorBoundary } from './shared/components/ErrorBoundary.tsx';
import { LoadingState } from './shared/components/LoadingState.tsx';
import { PairwiseComparator } from './features/verification/PairwiseComparator.tsx';
import { AlertCircle, RotateCw } from 'lucide-react';

import {
  Application,
  DocumentRecord,
  ExtractedField,
  Finding,
  AuditEvent,
  Rule,
  User
} from './types/index.ts';

import {
  fetchApplications,
  fetchApplicationById,
  fetchFindings,
  fetchAuditEvents,
  fetchRules,
  fetchCurrentUser,
  resetDemoData,
  ensureAuthToken,
  getAuthToken,
  logout
} from './services/api.ts';
import { LoginView } from './components/LoginView.tsx';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getAuthToken());
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isInspectingApplication, setIsInspectingApplication] = useState<boolean>(false);
  const [appDocuments, setAppDocuments] = useState<DocumentRecord[]>([]);
  const [appFindings, setAppFindings] = useState<Finding[]>([]);
  const [appFields, setAppFields] = useState<ExtractedField[]>([]);
  const [allFindings, setAllFindings] = useState<Finding[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr-001',
    displayName: 'Dr. Aruna Rao',
    email: 'aruna.rao@scrutiny.edu.in',
    role: 'Reviewer',
    department: 'Western Scrutiny Committee'
  });

  // Target document and page for deep linking into Document Review
  const [reviewTargetDocId, setReviewTargetDocId] = useState<string | undefined>();
  const [reviewTargetPage, setReviewTargetPage] = useState<number | undefined>();

  // Modals state
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [correctionField, setCorrectionField] = useState<ExtractedField | null>(null);
  const [reviewFinding, setReviewFinding] = useState<Finding | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLElement | null>(null);

  // Scroll to top when view or inspected application changes
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, isInspectingApplication, selectedApplication?.id]);

  // Load initial global data
  const loadGlobalData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      const [appsData, findingsData, auditsData, rulesData, userData] = await Promise.all([
        fetchApplications(),
        fetchFindings(),
        fetchAuditEvents(),
        fetchRules(),
        fetchCurrentUser()
      ]);
      setApplications(appsData);
      setAllFindings(findingsData);
      setAuditEvents(auditsData);
      setRules(rulesData);
      if (userData) {
        setCurrentUser(userData);
        setIsAuthenticated(true);
      }

      // Preload default application context for Evidence Viewer / Dossiers without locking the Applications list view
      if (!selectedApplication && appsData.length > 0) {
        const mismatchApp = appsData.find((a) => a.referenceNumber.includes('0842')) || appsData[0];
        await loadApplicationDetails(mismatchApp.id);
      }
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
      const isAuthError = err.message && (
        err.message.includes('401') ||
        err.message.includes('Authentication') ||
        err.message.includes('jwt expired') ||
        err.message.includes('Unauthorized') ||
        err.message.includes('Invalid or expired') ||
        err.message.includes('session token') ||
        err.message.includes('INVALID_TOKEN') ||
        err.message.includes('ROLE_REVOKED')
      );
      if (isAuthError) {
        logout();
        setIsAuthenticated(false);
      } else {
        setApiError(err.message || 'Failed to connect to Form2Fact Scrutiny API.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    await loadGlobalData();
  };

  const handleSignOut = () => {
    logout();
    setIsAuthenticated(false);
    setSelectedApplication(null);
    setIsInspectingApplication(false);
  };

  const loadApplicationDetails = async (id: string) => {
    try {
      const details = await fetchApplicationById(id);
      setSelectedApplication(details.application);
      setAppDocuments(details.documents);
      setAppFindings(details.findings);
      setAppFields(details.extractedFields);
    } catch (err) {
      console.error('Failed to load application details:', err);
    }
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  const handleSelectApplication = async (app: Application) => {
    await loadApplicationDetails(app.id);
    setIsInspectingApplication(true);
    setCurrentView('applications');
  };

  const handleNavigate = (view: ViewType) => {
    if (view === 'applications') {
      // Navigating to 'applications' via Sidebar, Breadcrumb, or 'View All' always shows the full Applications Docket list
      setIsInspectingApplication(false);
    }
    setCurrentView(view);
  };

  const handleOpenDocumentReview = (docId?: string, page?: number) => {
    setReviewTargetDocId(docId);
    setReviewTargetPage(page);
    setCurrentView('document-review');
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await resetDemoData();
      await loadGlobalData();
      if (selectedApplication) {
        await loadApplicationDetails(selectedApplication.id);
      }
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRefreshCurrentApp = async () => {
    if (selectedApplication) {
      await loadApplicationDetails(selectedApplication.id);
    }
    const [appsData, findingsData, auditsData] = await Promise.all([
      fetchApplications(),
      fetchFindings(),
      fetchAuditEvents()
    ]);
    setApplications(appsData);
    setAllFindings(findingsData);
    setAuditEvents(auditsData);
  };

  const openFindingsCount = allFindings.filter(
    (f) => f.status === 'Open' || f.status === 'Under Review' || f.status === 'Unable to Determine'
  ).length;

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans">
      {/* Modern SaaS Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        openFindingsCount={openFindingsCount}
        onSignOut={handleSignOut}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Clean Top Bar */}
        <Header
          currentView={currentView}
          selectedApplication={isInspectingApplication ? selectedApplication : null}
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onOpenIntake={() => setIsIntakeOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
        />

        {/* Scrollable Workspace Area */}
        <main
          ref={mainScrollRef}
          className="flex-1 min-h-0 overflow-y-auto scroll-smooth"
        >
          {apiError && (
            <div className="m-6 p-4 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg text-sm text-[#9F1239] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{apiError}</span>
              </div>
              <button
                type="button"
                onClick={loadGlobalData}
                className="px-3.5 py-1.5 bg-[#9F1239] hover:bg-[#881337] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <LoadingState message="Loading institutional scrutiny workspace..." />
          ) : (
            <ErrorBoundary>
              {currentView === 'overview' && (
                <OverviewView
                  applications={applications}
                  findings={allFindings}
                  rules={rules}
                  auditEvents={auditEvents}
                  onSelectApplication={handleSelectApplication}
                  onNavigate={handleNavigate}
                  onOpenIntake={() => setIsIntakeOpen(true)}
                  onOpenReviewAction={(finding) => setReviewFinding(finding)}
                />
              )}

              {currentView === 'verification' && (
                <div className="px-6 lg:px-8 py-8 pb-24 max-w-[1440px] mx-auto space-y-6 text-sm">
                  <div>
                    <h1 className="text-xl font-semibold text-[#0F172A] tracking-tight">
                      Pairwise Field Verification & Taxonomy Workbench
                    </h1>
                    <p className="text-sm text-[#64748B] mt-1">
                      Cross-verify applicant declared parameters against supporting documentary evidence using hybrid deterministic validation and abstention logic.
                    </p>
                  </div>
                  <PairwiseComparator />
                </div>
              )}

              {currentView === 'annotations' && (
                <AnnotationWorkbenchView
                  currentUser={currentUser}
                  onNavigate={handleNavigate}
                />
              )}

              {currentView === 'applications' && (
                isInspectingApplication && selectedApplication ? (
                  <ApplicationDetailView
                    application={selectedApplication}
                    documents={appDocuments}
                    findings={appFindings}
                    extractedFields={appFields}
                    auditEvents={auditEvents.filter(
                      (e) =>
                        e.entityReference.includes(selectedApplication.referenceNumber) ||
                        e.entityReference.includes(selectedApplication.id)
                    )}
                    onBack={() => setIsInspectingApplication(false)}
                    onOpenDocumentReview={handleOpenDocumentReview}
                    onOpenReport={() => setCurrentView('reports')}
                    onOpenCorrection={(field) => setCorrectionField(field)}
                    onOpenReviewAction={(finding) => setReviewFinding(finding)}
                    onRefreshData={handleRefreshCurrentApp}
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <ApplicationsView
                    applications={applications}
                    onSelectApplication={handleSelectApplication}
                    onOpenIntake={() => setIsIntakeOpen(true)}
                  />
                )
              )}

              {currentView === 'document-review' && (
                <DocumentReviewView
                  application={selectedApplication}
                  applications={applications}
                  documents={appDocuments.length > 0 ? appDocuments : []}
                  extractedFields={appFields}
                  findings={appFindings}
                  initialDocumentId={reviewTargetDocId}
                  initialPage={reviewTargetPage}
                  onSelectApplication={async (app) => {
                    await loadApplicationDetails(app.id);
                  }}
                  onBack={() => {
                    setIsInspectingApplication(true);
                    setCurrentView('applications');
                  }}
                  onNavigate={handleNavigate}
                  onOpenCorrection={(field) => setCorrectionField(field)}
                  onOpenReviewAction={(finding) => setReviewFinding(finding)}
                />
              )}

              {currentView === 'findings' && (
                <FindingsView
                  findings={allFindings}
                  applications={applications}
                  onSelectApplication={handleSelectApplication}
                  onOpenDocumentReview={async (app, docId, page) => {
                    await loadApplicationDetails(app.id);
                    handleOpenDocumentReview(docId, page);
                  }}
                  onOpenReviewAction={(finding) => setReviewFinding(finding)}
                />
              )}

              {currentView === 'rules' && (
                <RulesView
                  rules={rules}
                  onRefreshRules={async () => {
                    const r = await fetchRules();
                    setRules(r);
                  }}
                />
              )}

              {currentView === 'aicte-preview' && (
                <AictePreviewView
                  applications={applications}
                  selectedApplication={selectedApplication}
                  onSelectApplication={handleSelectApplication}
                />
              )}

              {currentView === 'reports' && (
                <ReportsView
                  applications={applications}
                  selectedApplication={selectedApplication}
                  onSelectApplication={handleSelectApplication}
                  onBack={() => handleNavigate('applications')}
                />
              )}

              {currentView === 'audit' && (
                <AuditLogView auditEvents={auditEvents} />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  currentUser={currentUser}
                  onUserChanged={(u) => setCurrentUser(u)}
                  onResetDemo={handleResetDemo}
                  isResetting={isResetting}
                />
              )}
            </ErrorBoundary>
          )}
        </main>
      </div>

      {/* Intake Modal */}
      <NewApplicationModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSuccess={async (newApp) => {
          await loadGlobalData();
          await loadApplicationDetails(newApp.id);
          setIsInspectingApplication(true);
          setCurrentView('applications');
        }}
      />

      {/* Field Correction Modal */}
      <CorrectionModal
        field={correctionField}
        isOpen={!!correctionField}
        onClose={() => setCorrectionField(null)}
        onSuccess={async () => {
          await handleRefreshCurrentApp();
        }}
      />

      {/* Review Decision Modal */}
      <ReviewActionModal
        finding={reviewFinding}
        isOpen={!!reviewFinding}
        onClose={() => setReviewFinding(null)}
        onSuccess={async () => {
          await handleRefreshCurrentApp();
        }}
      />
    </div>
  );
}
