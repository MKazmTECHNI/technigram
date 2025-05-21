export default function Home() {
  return (
    <div
      style={{
        maxWidth: 600,
        margin: "48px auto",
        background: "#181818",
        borderRadius: 16,
        padding: "32px 36px",
        color: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        fontFamily: "inherit",
      }}
    >
      <h1 style={{ color: "#c6a4ff", marginBottom: 16 }}>Technigram Rules</h1>
      <ul style={{ fontSize: "1.15em", lineHeight: 1.7, paddingLeft: 24 }}>
        <li>
          <b>Bez DDoSów i spamu.</b> Please don't attack the site or flood it
          with junk.
        </li>
        <li>
          <b>Pen-test with pleasure!</b> You are welcome to look for
          vulnerabilities and report them.
        </li>
      </ul>
      <p style={{ color: "#969696", marginTop: 24 }}>
        (Jestem zbyt leniwy żeby pisać długie zasady.)
      </p>
    </div>
  );
}
