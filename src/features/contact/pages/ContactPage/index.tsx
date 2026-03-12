import * as React from "react";

import { useNavigate, useSearchParams } from "react-router";

import {
  BackBtn,
  Card,
  ContactLink,
  Copy,
  Divider,
  List,
  ListItem,
  OfflineNote,
  PageContainer,
  PageHeader,
  PageTitle,
  SecondaryLink,
  SubTitle,
} from "./styles";

const CONTACT_EMAIL = "naftali@lubin.dev";
const GITHUB_REPO = "maniator/blipit-legends";
const BUG_REPORT_BASE = `https://github.com/${GITHUB_REPO}/issues/new?template=bug_report.md&labels=bug`;
const EMAIL_SUBJECT = encodeURIComponent("Bug report – BlipIt Baseball Legends");

const ISSUE_BODY_TEMPLATE = `**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (auto-filled)**`;

function buildEnvLines(fromErrorBoundary: boolean, reportedUrl?: string): string {
  return [
    `- Browser/UA: ${navigator.userAgent}`,
    `- URL: ${reportedUrl ?? window.location.href}`,
    `- Source: ${fromErrorBoundary ? "error-boundary" : "contact-page"}`,
  ].join("\n");
}

function buildMailtoUrl(fromErrorBoundary: boolean, reportedUrl?: string): string {
  const body = encodeURIComponent(
    `${ISSUE_BODY_TEMPLATE}\n${buildEnvLines(fromErrorBoundary, reportedUrl)}`,
  );
  return `mailto:${CONTACT_EMAIL}?subject=${EMAIL_SUBJECT}&body=${body}`;
}

function buildIssueUrl(fromErrorBoundary: boolean, reportedUrl?: string): string {
  return `${BUG_REPORT_BASE}&body=${encodeURIComponent(`${ISSUE_BODY_TEMPLATE}\n${buildEnvLines(fromErrorBoundary, reportedUrl)}`)}`;
}

const ContactPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOnline, setIsOnline] = React.useState(() => navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const source = searchParams.get("source");
  const fromErrorBoundary = source === "error-boundary";
  const reportedUrl = searchParams.get("url") ?? undefined;

  return (
    <PageContainer data-testid="contact-page">
      <PageHeader>
        <BackBtn
          type="button"
          onClick={() => navigate("/")}
          data-testid="contact-page-back-button"
          aria-label="Go back"
        >
          ← Back
        </BackBtn>
      </PageHeader>

      <PageTitle>📬 Contact / Report Bug</PageTitle>
      <Copy>
        If you spot something odd in the app, please send me a quick report so I can reproduce and
        fix it.
      </Copy>

      {fromErrorBoundary && (
        <Card data-testid="contact-page-error-boundary-hint">
          <SubTitle>Thanks for reporting a crash.</SubTitle>
          <Copy>
            If you reached this page from the error screen, include as much detail as you can about
            what you clicked right before the crash.
          </Copy>
        </Card>
      )}

      <Card>
        <SubTitle>Email me directly</SubTitle>
        <ContactLink
          href={buildMailtoUrl(fromErrorBoundary, reportedUrl)}
          data-testid="contact-page-email-link"
        >
          {CONTACT_EMAIL}
        </ContactLink>
      </Card>

      <Divider />

      <Card>
        <SubTitle>Open a pre-filled GitHub bug report</SubTitle>
        <Copy>
          This uses the bug issue template so reports stay consistent and easier to triage.
        </Copy>
        {isOnline ? (
          <SecondaryLink
            href={buildIssueUrl(fromErrorBoundary, reportedUrl)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="contact-page-issue-link"
          >
            Create GitHub issue
          </SecondaryLink>
        ) : (
          <OfflineNote data-testid="contact-page-offline-note">
            🔌 You appear to be offline. Connect to the internet to open a GitHub issue.
          </OfflineNote>
        )}
        <List>
          <ListItem>What happened vs what you expected</ListItem>
          <ListItem>Steps to reproduce</ListItem>
          <ListItem>Browser/device + approximate time</ListItem>
        </List>
      </Card>
    </PageContainer>
  );
};

export default ContactPage;
