import React, { useState, useRef } from 'react';
import './ValidateParking.css';

// ── Setup ──────────────────────────────────────────────
// 1. Go to https://formspree.io, log in, and upgrade to a paid plan
//    (file uploads require Personal tier or above).
// 2. Copy your form's endpoint (looks like https://formspree.io/f/xxxxxxx)
// 3. Paste it below, replacing YOUR_FORM_ID.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mzepdzdp';

export default function ValidateParking() {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  function handleFile(selected) {
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(selected);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
      setErrorMsg("This page isn't connected yet — add your Formspree endpoint in the code.");
      return;
    }
    if (!name || !file) {
      setErrorMsg('Please enter your name and attach a receipt photo.');
      return;
    }

    setStatus('sending');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('receipt', file);

      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
      } else {
        const result = await res.json().catch(() => null);
        setErrorMsg(result?.errors?.[0]?.message || 'Something went wrong sending that. Please try again.');
        setStatus('idle');
      }
    } catch (err) {
      setErrorMsg('Network error — check your connection and try again.');
      setStatus('idle');
    }
  }

  function handleReset() {
    setName('');
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="vp-body">
      <div className="vp-wrap">
        <div className="vp-eyebrow">
          <span className="vp-dash" />Parking Validation
        </div>
        <h1 className="vp-h1">
          Submit your <span>receipt</span>
        </h1>
        <p className="vp-sub">
          Enter your name and attach a photo of your receipt. We'll validate your parking as
          soon as we get it.
        </p>

        <div className="vp-stub">
          {status !== 'success' ? (
            <form onSubmit={handleSubmit}>
              {errorMsg && <div className="vp-error">{errorMsg}</div>}

              <div className="vp-field">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="e.g. Jordan Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div className="vp-hint">The name on your parking reservation.</div>
              </div>

              <div className="vp-perf" />

              <div className="vp-field">
                <label htmlFor="receipt">Receipt Photo</label>
                <div
                  className={`vp-upload${dragActive ? ' drag' : ''}`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={handleDrop}
                >
                  <svg className="vp-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 9l5-5 5 5M12 4v13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="vp-upload-text">Tap to take or upload a photo</div>
                  <div className="vp-upload-sub">JPG or PNG, up to 10MB</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="receipt"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    required
                  />
                </div>
                {previewUrl && (
                  <div className="vp-preview">
                    <img src={previewUrl} alt="Receipt preview" />
                  </div>
                )}
                {file && <div className="vp-filename">✓ {file.name}</div>}
              </div>

              <button type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending...' : 'Submit for Validation'}
              </button>
            </form>
          ) : (
            <div className="vp-success">
              <div className="vp-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="#46b37d" strokeWidth="2.4">
                  <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="vp-stamp">Received</div>
              <h2>You're all set</h2>
              <p>
                Your name and receipt were sent over. We'll validate your parking shortly — no
                further action needed.
              </p>
              <button className="vp-reset-link" type="button" onClick={handleReset}>
                Submit another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
