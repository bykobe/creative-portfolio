import Link from "next/link";

export default function CorporatePage() {
  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", marginBottom: "3rem" }}>
        <span>Kobe Tio — Corporate Resume</span>
        <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>← Back to 3D Creative View</Link>
      </nav>

      <section style={{ marginBottom: "2rem" }}>
        <h1>Ebenezer Kwabena Tio (Kobby)</h1>
        <p>Frontend Engineer & UI/UX Designer based in Accra, Ghana.</p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2>Selected Case Studies</h2>
        <ul>
          <li><strong>STAYR:</strong> Student housing platform UI and Notion CRM workflow.</li>
          <li><strong>CRESTA:</strong> Web application integration with Sanity CMS and Paystack.</li>
        </ul>
      </section>
    </main>
  );
}
