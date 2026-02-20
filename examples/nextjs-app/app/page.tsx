import React from 'react';

export default function Home() {
  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
        ShakeNbake Demo
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Press <kbd style={kbdStyle}>Cmd+Shift+K</kbd> (macOS) or{' '}
        <kbd style={kbdStyle}>Ctrl+Shift+K</kbd> (Windows/Linux) to report a
        bug. You can also click the floating bug button in the bottom-right
        corner.
      </p>

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <Card title="Screenshot Capture" description="Automatically captures the current page using html2canvas." />
        <Card title="Annotation Tools" description="Draw, highlight, and add arrows to annotate your screenshot." />
        <Card title="Context Collection" description="Collects browser, device, network, and console data automatically." />
        <Card title="Linear Integration" description="Bug reports are created as Linear issues via a server-side proxy." />
      </div>

      <section style={{ marginTop: '48px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
          Sample Content
        </h2>
        <p style={{ lineHeight: 1.6, color: '#444' }}>
          This page exists to give you something to screenshot and annotate.
          Try triggering a bug report and drawing on the screenshot to highlight
          an issue. The report form will be pre-filled with device context
          collected from your browser.
        </p>
      </section>
    </main>
  );
}

function Card({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#fafafa',
      }}
    >
      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  fontSize: '12px',
  fontFamily: 'monospace',
  backgroundColor: '#f0f0f0',
  border: '1px solid #ccc',
  borderRadius: '3px',
};
