import { LegalPage, Section, Bullets } from "@/components/legal-page";

export const metadata = {
  title: "Terms of Service | renchit",
  description:
    "The terms that govern your use of renchit, operated by SumoLab LLC.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated="August 12, 2026">
      <Section heading="Agreement">
        <p>
          These Terms of Service govern your use of renchit, an SEO toolkit
          operated by SumoLab LLC, a limited liability company based in Chandler,
          Arizona (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By
          creating an account or using the service, you agree to these terms. If
          you do not agree, please do not use renchit.
        </p>
      </Section>

      <Section heading="What renchit does">
        <p>
          renchit provides website analysis tools, including site auditing,
          keyword and content idea research, on-page content grading, local
          listing consistency checks, page speed testing, and, if you connect it,
          reporting on your Google Search Console data. The tools produce
          informational analysis and suggestions.
        </p>
        <p>
          We may add, change, or remove features over time. We will try not to
          break things you depend on, but we do not guarantee that any particular
          feature will remain available.
        </p>
      </Section>

      <Section heading="Your account">
        <p>
          You sign in through Google. You are responsible for maintaining control
          of the Google account you use and for all activity that happens under
          your renchit account. Let us know promptly at{" "}
          <a href="mailto:info@sumolab.co" className="font-medium text-brand-strong hover:underline">
            info@sumolab.co
          </a>{" "}
          if you believe your account has been accessed without your permission.
        </p>
        <p>
          You must be at least 13 years old, and old enough to form a binding
          contract where you live, to use renchit.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          Our tools fetch pages from websites you specify. This carries real
          responsibility, so:
        </p>
        <Bullets
          items={[
            "Only submit websites that you own, operate, or are otherwise authorized to analyze.",
            "Do not use renchit to overload, disrupt, or attack any website or server.",
            "Do not attempt to circumvent rate limits, access other users' data, or reverse engineer the service.",
            "Do not use renchit for anything unlawful, or to analyze sites hosting unlawful content.",
            "Do not resell or redistribute the service or its output as your own product without our written permission.",
          ]}
        />
        <p>
          We may suspend or terminate accounts that violate these rules, and we
          may impose reasonable usage limits to keep the service available for
          everyone.
        </p>
      </Section>

      <Section heading="Third-party services and data">
        <p>
          renchit relies on third-party services, including Google&apos;s
          PageSpeed Insights, Search Console, and search suggestion data. Their
          availability, accuracy, and terms are outside our control. If a provider
          changes or restricts access, related features may change or stop
          working.
        </p>
        <p>
          Your use of Google services through renchit is also subject to
          Google&apos;s own terms and policies.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          You keep all rights to the websites, keywords, business details, and
          other information you submit. You grant us only the permission needed to
          operate the service: to fetch, process, store, and display that
          information back to you.
        </p>
      </Section>

      <Section heading="Our content">
        <p>
          renchit, including its software, design, branding, and written content,
          belongs to SumoLab LLC and is protected by intellectual property law.
          The analysis and recommendations the tools generate for you are yours to
          use freely for your own business.
        </p>
      </Section>

      <Section heading="No guarantee of results">
        <p>
          This one matters, so we want to be direct about it. renchit gives you
          information and suggestions based on established SEO practice and data
          from third parties like Google. Search rankings depend on many factors
          outside our control and outside yours, including competitors&apos;
          actions and changes to search engine algorithms.
        </p>
        <p>
          <strong className="text-foreground">
            We do not guarantee any particular ranking, traffic level, or business
            outcome.
          </strong>{" "}
          Nothing renchit produces is a promise of results, and none of it is
          legal, financial, or professional advice.
        </p>
      </Section>

      <Section heading="Availability and disclaimers">
        <p>
          renchit is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo;
          without warranties of any kind, whether express or implied, including
          implied warranties of merchantability, fitness for a particular purpose,
          and non-infringement. We do not warrant that the service will be
          uninterrupted, error-free, or that its analysis will be complete or
          accurate.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, SumoLab LLC will not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages, or for any loss of profits, revenue, data, or business
          opportunity, arising out of or related to your use of renchit.
        </p>
        <p>
          To the fullest extent permitted by law, our total liability for any
          claim relating to the service will not exceed the greater of the amount
          you paid us in the twelve months before the claim, or one hundred US
          dollars.
        </p>
      </Section>

      <Section heading="Indemnification">
        <p>
          You agree to indemnify and hold harmless SumoLab LLC from claims,
          damages, and expenses (including reasonable legal fees) arising from
          your misuse of the service, your violation of these terms, or your
          analysis of websites you were not authorized to analyze.
        </p>
      </Section>

      <Section heading="Termination">
        <p>
          You may stop using renchit at any time and request deletion of your
          account by emailing{" "}
          <a href="mailto:info@sumolab.co" className="font-medium text-brand-strong hover:underline">
            info@sumolab.co
          </a>
          . We may suspend or terminate your access if you violate these terms or
          if we discontinue the service. Provisions that by their nature should
          survive termination, including intellectual property, disclaimers, and
          limitation of liability, will survive.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of the State of Arizona, United
          States, without regard to its conflict of law rules. Any dispute will be
          brought in the state or federal courts located in Maricopa County,
          Arizona, and you and we consent to their jurisdiction.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p>
          We may update these terms as the service evolves. When we do, we will
          revise the &ldquo;Last updated&rdquo; date above. Continuing to use
          renchit after a change means you accept the revised terms.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          SumoLab LLC
          <br />
          Chandler, Arizona, United States
          <br />
          <a href="mailto:info@sumolab.co" className="font-medium text-brand-strong hover:underline">
            info@sumolab.co
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
