export default function CookiesPage() {
  return (
    <div style={{ maxWidth: 700, margin: "48px auto", padding: "0 24px", color: "#fff" }}>
      <h1 style={{ color: "#c6a4ff", marginBottom: 24 }}>Cookies Policy</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: "1.05em", lineHeight: 1.6 }}>
        <p>Technigram uses cookies minimally and only for essential functionality.</p>
        <h3 style={{ color: "#c6a4ff", marginTop: 8 }}>What are cookies?</h3>
        <p>Cookies are small text files stored on your device by your browser. They help websites remember your session.</p>
        <h3 style={{ color: "#c6a4ff", marginTop: 8 }}>Cookies we use</h3>
        <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          <li><b>Session cookie:</b> Used by express-session to keep you logged in during your visit. This is temporary and deleted when you close your browser.</li>
          <li><b>No tracking:</b> We do not use analytics, advertising, or third-party tracking cookies.</li>
        </ul>
        <h3 style={{ color: "#c6a4ff", marginTop: 8 }}>Managing cookies</h3>
        <p>You can control cookies through your browser settings. Disabling cookies may affect login functionality.</p>
        <p style={{ color: "#969696", marginTop: 16 }}>Last updated: May 2026</p>
      </div>
    </div>
  );
}