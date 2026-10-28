import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, ViewType } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { ApplicationsView } from './components/ApplicationsView.tsx';
import { ApplicationDetailView } from './components/ApplicationDetailView.tsx';
import { DocumentReviewView } from './components/DocumentReviewView.tsx';
import { FindingsView } from './components/FindingsView.tsx';
import { RulesView } from './components/RulesView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { NewApplicationModal } from './components/NewApplicationModal.tsx';
import { CorrectionModal } from './components/CorrectionModal.tsx';
import { ReviewActionModal } from './components/ReviewActionModal.tsx';

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
  resetDemoData
} from './services/api.ts';

export default function App() {
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

  const mainScrollRef = useRef<HTMLElement | null>(null);

  // Scroll to top when view or inspected application changes
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentView, isInspectingApplication, selectedApplication?.id]);

  // Load initial global data
  const loadGlobalData = async () => {
    try {
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
      if (userData) setCurrentUser(userData);

      // Preload default application context for Evidence Viewer / Dossiers without locking the Applications list view
      if (!selectedApplication && appsData.length > 0) {
        const mismatchApp = appsData.find((a) => a.referenceNumber.includes('0842')) || appsData[0];
        await loadApplicationDetails(mismatchApp.id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans">
      {/* Modern SaaS Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        openFindingsCount={openFindingsCount}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Clean Top Bar */}
        <Header
          currentView={currentView}
          selectedApplication={isInspectingApplication ? selectedApplication : null}
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
          {isLoading ? (
            <div className="p-16 text-center text-sm text-[#64748B]">
              Loading workspace...
            </div>
          ) : (
            <>
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
            </>
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
