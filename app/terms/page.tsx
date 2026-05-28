export default function TermsPage() {
  return (
    <div style={{ maxWidth: 700, margin: "48px auto", padding: "0 24px", color: "#fff" }}>
      <h1 style={{ color: "#c6a4ff", marginBottom: 24 }}>Terms of Service</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: "1.05em", lineHeight: 1.6 }}>
        <p>By using Technigram, you agree to the following terms:</p>
        <ol style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <li><b>Acceptance:</b> By accessing this platform, you accept these terms in full.</li>
          <li><b>Content:</b> You are solely responsible for any content you post. Do not post illegal, harmful, or abusive material.</li>
          <li><b>Privacy:</b> We collect basic account information (email, name) via Google OAuth. We do not sell your data.</li>
          <li><b>Cookies:</b> We use essential session cookies for authentication. No tracking cookies are used.</li>
          <li><b>Conduct:</b> Do not attempt to disrupt the service, spam, or exploit vulnerabilities maliciously. Responsible disclosure is encouraged.</li>
          <li><b>Termination:</b> We reserve the right to suspend accounts that violate these terms.</li>
          <li><b>Changes:</b> These terms may be updated. Continued use after changes constitutes acceptance.</li>
        </ol>
        <p style={{ color: "#969696", marginTop: 16 }}>Last updated: May 2026</p>
      </div>
    </div>
  );
}