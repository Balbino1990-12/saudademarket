async function fetchSettings() {
  try {
    const res = await fetch('/api/admin/settings', { credentials: 'include' });
    if (res.status === 401) {
      // Redirect to admin login when session is invalid; include return URL
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
      window.location.href = `/admin/login.html?next=${returnTo}`;
      return {};
    }
    if (!res.ok) throw new Error('Failed to load settings');
    const json = await res.json();
    return json.data || {};
  } catch (err) {
    console.error('[settings.js] fetchSettings error', err);
    return {};
  }
}

async function saveSettings(payload) {
  try {
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error('[settings.js] saveSettings error', err);
    return { success: false, error: err.message };
  }
}

async function uploadLogo(file) {
  try {
    const fd = new FormData();
    fd.append('logo', file);
    const res = await fetch('/api/admin/settings/logo', {
      method: 'POST',
      credentials: 'include',
      body: fd
    });
    return await res.json();
  } catch (err) {
    console.error('[settings.js] uploadLogo error', err);
    return { success: false, error: err.message };
  }
}

function populateForm(settings) {
  document.getElementById('siteTitle').value = settings.siteTitle || '';
  document.getElementById('contactEmail').value = settings.contactEmail || '';
  document.getElementById('defaultLanguage').value = settings.defaultLanguage || 'en';
  document.getElementById('currency').value = settings.currency || '';
  document.getElementById('maintenanceMode').checked = !!settings.maintenanceMode;
  document.getElementById('analyticsId').value = settings.analyticsId || '';
  document.getElementById('advancedJson').value = settings.advancedJson ? JSON.stringify(settings.advancedJson, null, 2) : '';
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settingsForm');
  const saveBtn = document.getElementById('saveSettingsBtn');
  const status = document.getElementById('saveStatus');

  const settings = await fetchSettings();
  populateForm(settings);

  // Populate logo preview
  const logoPreview = document.getElementById('siteLogoPreview');
  const logoUrlInput = document.getElementById('siteLogoUrl');
  if (settings.siteLogo) {
    logoPreview.src = settings.siteLogo;
    logoUrlInput.value = settings.siteLogo;
  } else {
    logoPreview.src = '/images/Saudade_market.png';
  }

  // Handle logo input change -> upload immediately
  const logoInput = document.getElementById('siteLogoInput');
  logoInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    status.textContent = 'Uploading logo...';
    const up = await uploadLogo(file);
    if (up && up.success && up.url) {
      logoPreview.src = up.url;
      logoUrlInput.value = up.url;
      status.textContent = 'Logo uploaded';
      setTimeout(() => status.textContent = '', 2000);
    } else {
      status.textContent = 'Logo upload failed';
      console.error('upload response', up);
    }
  });

  saveBtn.addEventListener('click', async () => {
    status.textContent = 'Saving...';
    const payload = {
      siteTitle: document.getElementById('siteTitle').value.trim(),
      contactEmail: document.getElementById('contactEmail').value.trim(),
      defaultLanguage: document.getElementById('defaultLanguage').value,
      currency: document.getElementById('currency').value.trim(),
      maintenanceMode: document.getElementById('maintenanceMode').checked,
      analyticsId: document.getElementById('analyticsId').value.trim()
    };

    const logoUrl = document.getElementById('siteLogoUrl').value;
    if (logoUrl) payload.siteLogo = logoUrl;

    const adv = document.getElementById('advancedJson').value.trim();
    if (adv) {
      try { payload.advancedJson = JSON.parse(adv); } catch (e) { status.textContent = 'Invalid JSON in advanced field'; return; }
    }

    const res = await saveSettings(payload);
    if (res && res.success) {
      status.textContent = 'Saved';
      setTimeout(() => status.textContent = '', 2500);
    } else {
      status.textContent = 'Error saving settings';
      console.error('save response', res);
    }
  });
});
