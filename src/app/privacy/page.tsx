import { LegalPage, Section, Bullets } from "@/components/legal-page";

export const metadata = {
  title: "Privacy Policy | renchit",
  description:
    "How renchit collects, uses, stores, and shares your information, including Google user data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="August 12, 2026">
      <Section heading="Who we are">
        <p>
          renchit is an SEO toolkit operated by SumoLab LLC, a limited liability
          company based in Chandler, Arizona (&ldquo;we,&rdquo; &ldquo;us,&rdquo;
          or &ldquo;our&rdquo;). This policy explains what information we collect
          when you use renchit at renchit.com, why we collect it, and what we do
          with it.
        </p>
        <p>
          If you have questions about anything here, email us at{" "}
          <a href="mailto:support@renchit.com" className="font-medium text-brand-strong hover:underline">
            support@renchit.com
          </a>
          .
        </p>
      </Section>

      <Section heading="Information we collect">
        <p>
          <strong className="text-foreground">Account information.</strong> You
          sign in with Google. We receive your name, email address, profile
          picture, and Google account identifier. We never see or store your
          Google password.
        </p>
        <p>
          <strong className="text-foreground">Profile information you provide.</strong>{" "}
          Optionally, your full name, company name, and LinkedIn profile URL.
        </p>
        <p>
          <strong className="text-foreground">Information you submit to the tools.</strong>{" "}
          This includes website addresses you ask us to analyze, target keywords,
          topics you research, and, if you use the Local Listing Checker,
          business details such as your business name, address, phone number,
          review count, and rating.
        </p>
        <p>
          <strong className="text-foreground">Results we generate.</strong> We
          store the output of each tool run (audit findings, keyword ideas,
          content grades, listing checks, page speed results, search reports) so
          you can revisit them and track progress over time.
        </p>
        <p>
          <strong className="text-foreground">Google Search Console data.</strong>{" "}
          If you choose to connect Google Search Console, we request read-only
          access and retrieve search performance data for the properties you
          select: search queries, impressions, clicks, and average position. We
          request read-only permission only; we cannot modify anything in your
          Search Console account.
        </p>
        <p>
          We do not use advertising cookies or third-party tracking pixels. The
          only cookies we set are the ones required to keep you signed in and to
          remember interface preferences, such as whether your sidebar is
          collapsed.
        </p>
      </Section>

      <Section heading="How we use your information">
        <Bullets
          items={[
            "To provide the tools you request and display their results to you",
            "To keep you signed in and associate your saved work with your account",
            "To group your audits, grades, and reports by website into projects",
            "To respond to you when you contact us for support",
            "To diagnose errors and keep the service running reliably",
          ]}
        />
        <p>
          We do not sell your personal information. We do not share it with
          advertisers, and we do not use it to build advertising profiles.
        </p>
      </Section>

      <Section heading="How we handle Google user data">
        <p>
          renchit&apos;s use of information received from Google APIs adheres to
          the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-strong hover:underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>Specifically:</p>
        <Bullets
          items={[
            "We use Google Search Console data only to show you your own search performance inside renchit.",
            "We do not transfer this data to third parties except as needed to provide the service, comply with the law, or as part of a merger or acquisition.",
            "We do not use this data for advertising of any kind.",
            "We do not allow humans to read this data, except where you explicitly ask us to for support, where it is necessary for security or to comply with the law, or where the data has been aggregated and anonymized.",
          ]}
        />
        <p>
          You can disconnect Google access at any time from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-strong hover:underline"
          >
            Google Account permissions page
          </a>
          . Doing so immediately revokes our ability to retrieve any further data.
        </p>
      </Section>

      <Section heading="Service providers">
        <p>
          We rely on a small number of third parties to operate renchit. Each
          processes data only to provide their service to us:
        </p>
        <Bullets
          items={[
            <>
              <strong className="text-foreground">Vercel</strong>: application
              hosting and delivery
            </>,
            <>
              <strong className="text-foreground">Neon</strong>: the managed
              PostgreSQL database where your account and results are stored
            </>,
            <>
              <strong className="text-foreground">Google</strong>: sign-in
              (OAuth), PageSpeed Insights, Search Console, and search suggestion
              data
            </>,
          ]}
        />
      </Section>

      <Section heading="Websites you analyze">
        <p>
          When you submit a website address, our crawler requests pages from that
          site the way a search engine would, identifying itself as
          &ldquo;RenchitBot.&rdquo; We respect robots.txt directives. We store the
          page data we retrieve so we can show you the results.
        </p>
        <p>
          You should only submit websites you own or are authorized to analyze.
          See our Terms of Service for more.
        </p>
      </Section>

      <Section heading="Data retention and deletion">
        <p>
          We keep your account information for as long as your account is active.
          You can delete individual audits, keyword searches, content grades,
          listing checks, page speed tests, and search reports at any time from
          within the app, and deletion is immediate and permanent.
        </p>
        <p>
          To delete your entire account and all associated data, email{" "}
          <a href="mailto:support@renchit.com" className="font-medium text-brand-strong hover:underline">
            support@renchit.com
          </a>{" "}
          and we will remove it within 30 days.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct,
          export, or delete the personal information we hold about you, and to
          object to certain processing. To exercise any of these, email{" "}
          <a href="mailto:support@renchit.com" className="font-medium text-brand-strong hover:underline">
            support@renchit.com
          </a>
          . We will not charge you or degrade your service for making a request.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          Data is transmitted over encrypted connections (HTTPS) and stored in a
          managed database with access restricted to the service. No system is
          perfectly secure, but we take reasonable measures appropriate to the
          sensitivity of the information we hold.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          renchit is a business tool and is not directed to children under 13. We
          do not knowingly collect personal information from children. If you
          believe a child has provided us information, contact us and we will
          delete it.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this policy as the product changes. When we do, we will
          revise the &ldquo;Last updated&rdquo; date above. If a change materially
          affects how we handle your information, we will make a reasonable effort
          to notify you.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          SumoLab LLC
          <br />
          Chandler, Arizona, United States
          <br />
          <a href="mailto:support@renchit.com" className="font-medium text-brand-strong hover:underline">
            support@renchit.com
          </a>
          <br />
          <a
            href="https://sumolab.co"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-strong hover:underline"
          >
            sumolab.co
          </a>
        </p>
      </Section>
    </LegalPage>
  );
}
