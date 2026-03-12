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
  PageContainer,
  PageHeader,
  PageTitle,
  SecondaryLink,
  SubTitle,
} from "./styles";

const CONTACT_EMAIL = "naftali@lubin.dev";
const BUG_REPORT_URL =
  "https://github.com/maniator/self-playing-baseball/issues/new?template=bug_report.md&labels=bug";

const ContactPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const source = searchParams.get("source");
  const fromErrorBoundary = source === "error-boundary";

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

      <PageTitle>📬 Contact / Report Something Weird</PageTitle>
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
        <ContactLink href={`mailto:${CONTACT_EMAIL}`} data-testid="contact-page-email-link">
          {CONTACT_EMAIL}
        </ContactLink>
      </Card>

      <Divider />

      <Card>
        <SubTitle>Or open a pre-filled GitHub bug report</SubTitle>
        <Copy>
          This uses the bug issue template so reports stay consistent and easier to triage.
        </Copy>
        <SecondaryLink
          href={BUG_REPORT_URL}
          target="_blank"
          rel="noreferrer"
          data-testid="contact-page-issue-link"
        >
          Create GitHub bug report
        </SecondaryLink>
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
