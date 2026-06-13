// ============================================================
//  AUTH & LOGIN
// ============================================================

const SESSION_KEY = 'omega_admin_token';

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

function saveToken(token) {
  sessionStorage.setItem(SESSION_KEY, token);
}

function clearToken() {
  sessionStorage.removeItem(SESSION_KEY);
}

function authedFetch(url, options = {}) {
  const token = getToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
}

// Login
const loginScreen = document.getElementById('login-screen');
const dashboardWrapper = document.getElementById('dashboard-wrapper');
const loginForm = document.getElementById('login-form');
const loginInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const loginBtnText = document.getElementById('login-btn-text');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = loginInput.value.trim();
  if (!password) return;

  loginBtnText.textContent = 'Anmelden…';
  loginForm.querySelector('button[type="submit"]').disabled = true;
  loginError.classList.add('hidden');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      const data = await res.json();
      saveToken(data.token);
      showDashboard();
    } else {
      loginError.classList.remove('hidden');
      loginError.style.animation = 'none';
      void loginError.offsetWidth;
      loginError.style.animation = '';
      loginInput.value = '';
      loginInput.focus();
    }
  } catch {
    loginError.classList.remove('hidden');
    loginError.textContent = 'Server nicht erreichbar.';
  } finally {
    loginBtnText.textContent = 'Einloggen';
    loginForm.querySelector('button[type="submit"]').disabled = false;
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await authedFetch('/api/logout', { method: 'POST' }).catch(() => {});
  clearToken();
  location.reload();
});

function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboardWrapper.classList.remove('hidden');
  lucide.createIcons();
  bootDashboard();
}

function tryAutoLogin() {
  const token = getToken();
  if (token) {
    authedFetch('/api/stats')
      .then(res => {
        if (res.ok) showDashboard();
        else { clearToken(); lucide.createIcons(); }
      })
      .catch(() => lucide.createIcons());
  } else {
    lucide.createIcons();
  }
}

// ============================================================
//  DASHBOARD CONTROL & INTERACTIVE
// ============================================================

function bootDashboard() {
  // Tab Navigation
  const tabButtons = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      
      if (targetTab === 'tab-telemetry') scrollTerminalToBottom();
      
      // Feedback polling start/stop
      if (feedbackPollInterval) {
        clearInterval(feedbackPollInterval);
        feedbackPollInterval = null;
      }
      if (targetTab === 'tab-feedback') {
        fetchAndRenderTickets();
        feedbackPollInterval = setInterval(fetchAndRenderTickets, 10000);
      }
    });
  });

  // Feedback Filters
  document.getElementById('filter-project').addEventListener('change', renderTicketsList);
  document.getElementById('filter-type').addEventListener('change', renderTicketsList);
  document.getElementById('filter-status').addEventListener('change', renderTicketsList);

  // Feedback Details Actions
  document.getElementById('btn-send-reply').addEventListener('click', sendSupportReply);
  document.getElementById('btn-close-ticket').addEventListener('click', closeSupportTicket);
  
  // Copy logs button
  document.getElementById('btn-copy-ticket-logs').addEventListener('click', () => {
    const logContent = document.getElementById('ticket-detail-logs').textContent;
    navigator.clipboard.writeText(logContent).then(() => {
      alert('Logs in die Zwischenablage kopiert!');
    }).catch(err => {
      console.error(err);
      alert('Kopieren fehlgeschlagen.');
    });
  });

  // Enter triggers reply send (Ctrl+Enter)
  document.getElementById('chat-reply-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      sendSupportReply();
    }
  });

  // Refresh
  document.getElementById('btn-refresh').addEventListener('click', () => {
    fetchAndRenderStats();
    if (document.getElementById('tab-feedback').classList.contains('active')) {
      fetchAndRenderTickets();
    }
  });

  // Terminal Clear
  document.getElementById('btn-clear-terminal').addEventListener('click', () => {
    document.getElementById('terminal-body').innerHTML =
      `<div class="text-muted italic">[Konsole geleert]</div>`;
  });

  // Simulator: Toggle target update dropdown when download action is selected
  const simAction = document.getElementById('simulate-action');
  const simTargetGroup = document.getElementById('simulate-update-target-group');
  simAction.addEventListener('change', () => {
    if (simAction.value === 'download') {
      simTargetGroup.classList.remove('hidden');
    } else {
      simTargetGroup.classList.add('hidden');
    }
  });

  // Simulator: Test-Ping senden
  const btnSimulate = document.getElementById('btn-simulate-ping');
  btnSimulate.addEventListener('click', async () => {
    btnSimulate.disabled = true;
    btnSimulate.innerText = 'Sende Ping...';

    // Generiere UUID oder wähle bestehende
    const selectClient = document.getElementById('simulate-client-id').value;
    const clientId = selectClient === 'random' ? crypto.randomUUID() : selectClient;

    const osVal = document.getElementById('simulate-os').value;
    const versionVal = document.getElementById('simulate-version').value;
    const actionVal = simAction.value;

    const payload = {
      clientId,
      os: osVal,
      version: versionVal,
      action: actionVal,
      specs: {
        cpu: document.getElementById('simulate-cpu').value,
        cpuCores: osVal === 'darwin' ? 10 : 8,
        gpu: document.getElementById('simulate-gpu').value,
        ramGB: parseInt(document.getElementById('simulate-ram').value, 10) || 16,
        diskGB: parseInt(document.getElementById('simulate-disk').value, 10) || 512
      },
      geo: {
        country: document.getElementById('simulate-country').value,
        countryCode: document.getElementById('simulate-country-code').value.toUpperCase(),
        city: document.getElementById('simulate-city').value
      }
    };

    if (actionVal === 'download') {
      payload.updateFrom = versionVal;
      payload.updateTo = document.getElementById('simulate-update-target').value;
    }

    try {
      const res = await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchAndRenderStats();
        alert('Simulierter Ping erfolgreich gesendet und verarbeitet!');
      } else {
        alert('Server meldet Fehler.');
      }
    } catch {
      alert('Konnte Ping nicht absetzen (Verbindungsfehler).');
    } finally {
      btnSimulate.disabled = false;
      btnSimulate.innerText = 'Test-Ping absenden';
    }
  });

  // Danger Zone
  document.getElementById('btn-clear-logs').addEventListener('click', async () => {
    if (!confirm('Bist du sicher? Alle Logs werden unwiderruflich gelöscht.')) return;
    const res = await authedFetch('/api/control/clear', { method: 'POST' });
    if (res.ok) { await fetchAndRenderStats(); alert('Datenbank geleert.'); }
  });

  document.getElementById('btn-seed-logs').addEventListener('click', async () => {
    if (!confirm('Demo-Daten laden? Bestehende Logs werden überschrieben.')) return;
    const res = await authedFetch('/api/control/seed', { method: 'POST' });
    if (res.ok) { await fetchAndRenderStats(); alert('Erweiterte Demo-Daten geladen.'); }
  });

  fetchAndRenderStats();
  setInterval(fetchAndRenderStats, 45000);
}

// ============================================================
//  API DATA FETCH
// ============================================================

async function fetchAndRenderStats() {
  const btnRefresh = document.getElementById('btn-refresh');
  const icon = btnRefresh ? btnRefresh.querySelector('i') : null;
  if (icon) icon.classList.add('animate-spin');

  try {
    const response = await authedFetch('/api/stats');
    if (response.status === 401) {
      clearToken();
      location.reload();
      return;
    }
    if (!response.ok) throw new Error('API-Fehler');

    const data = await response.json();
    renderStatsOverview(data);
    renderTrendChart(data.internal.dailyTrend);
    renderDonutChart(data.internal.osBreakdown);
    renderReleasesTable(data.github.releases, data.internal.versionBreakdown);
    renderGeoList(data.internal.geoList);
    renderHardwareRankings(data.internal.hardware, data.internal.users.length);
    renderUsersTable(data.internal.users);
    renderTerminalLogs(data.internal.recentLogs);
  } catch (err) {
    console.error('Fehler beim Laden der Statistiken:', err);
  } finally {
    if (icon) setTimeout(() => icon.classList.remove('animate-spin'), 600);
  }
}

// ============================================================
//  RENDER HELPER & EMOJIS
// ============================================================

/** Wandelt Ländercodes in Emojis um */
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2 || countryCode === 'LCL' || countryCode === 'UN') {
    return '🌐';
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

// ============================================================
//  RENDER FUNCTIONS
// ============================================================

function renderStatsOverview(data) {
  const ghTotal = data.github.totalDownloads || 0;
  const appTotal = data.internal.totalDownloads || 0;
  const checksTotal = data.internal.totalChecks || 0;

  document.getElementById('stat-total-downloads').innerText = (ghTotal + appTotal).toLocaleString('de-DE');
  document.getElementById('stat-github-downloads').innerText = ghTotal.toLocaleString('de-DE');
  document.getElementById('stat-app-updates').innerText = appTotal.toLocaleString('de-DE');
  document.getElementById('stat-update-checks').innerText = checksTotal.toLocaleString('de-DE');
}

function renderTrendChart(trendData) {
  const svg = document.getElementById('svg-trend-chart');
  svg.innerHTML = '';
  if (!trendData || trendData.length === 0) return;

  const width = 800, height = 300;
  const paddingLeft = 50, paddingRight = 30, paddingTop = 20, paddingBottom = 40;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  let maxVal = 5;
  trendData.forEach(d => {
    if (d.checks > maxVal) maxVal = d.checks;
    if (d.downloads > maxVal) maxVal = d.downloads;
  });
  maxVal = Math.ceil(maxVal * 1.15);

  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round((maxVal / 4) * i);
    const yPos = height - paddingBottom - (chartHeight / 4) * i;

    const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridLine.setAttribute('x1', paddingLeft); gridLine.setAttribute('y1', yPos);
    gridLine.setAttribute('x2', width - paddingRight); gridLine.setAttribute('y2', yPos);
    gridLine.setAttribute('stroke', 'rgba(255,255,255,0.05)'); gridLine.setAttribute('stroke-width', '1');
    svg.appendChild(gridLine);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', paddingLeft - 10); label.setAttribute('y', yPos + 4);
    label.setAttribute('text-anchor', 'end'); label.setAttribute('fill', '#64748b');
    label.setAttribute('font-size', '10px'); label.setAttribute('font-weight', '600');
    label.textContent = yVal;
    svg.appendChild(label);
  }

  const pointsChecks = [], pointsDownloads = [];
  const stepX = chartWidth / (trendData.length - 1);

  trendData.forEach((d, index) => {
    const x = paddingLeft + index * stepX;
    pointsChecks.push(`${x},${height - paddingBottom - (d.checks / maxVal) * chartHeight}`);
    pointsDownloads.push(`${x},${height - paddingBottom - (d.downloads / maxVal) * chartHeight}`);

    if (index % 5 === 0 || index === trendData.length - 1) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', x); label.setAttribute('y', height - paddingBottom + 20);
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('fill', '#64748b');
      label.setAttribute('font-size', '10px'); label.setAttribute('font-weight', '600');
      const p = d.date.split('-');
      label.textContent = `${p[2]}.${p[1]}`;
      svg.appendChild(label);
    }
  });

  // Checks path
  const pathChecks = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathChecks.setAttribute('d', `M ${pointsChecks.join(' L ')}`);
  pathChecks.setAttribute('fill', 'none'); pathChecks.setAttribute('stroke', '#64748b');
  pathChecks.setAttribute('stroke-width', '2'); pathChecks.setAttribute('stroke-dasharray', '5,5');
  pathChecks.setAttribute('stroke-linecap', 'round');
  svg.appendChild(pathChecks);

  // Downloads gradient
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', 'downloadsGrad'); gradient.setAttribute('x1', '0'); gradient.setAttribute('y1', '0');
  gradient.setAttribute('x2', '0'); gradient.setAttribute('y2', '1');
  const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#8b5cf6'); stop1.setAttribute('stop-opacity', '0.25');
  const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
  stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#8b5cf6'); stop2.setAttribute('stop-opacity', '0.00');
  gradient.appendChild(stop1); gradient.appendChild(stop2); defs.appendChild(gradient); svg.appendChild(defs);

  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  areaPath.setAttribute('d', `M ${paddingLeft},${height - paddingBottom} L ${pointsDownloads.join(' L ')} L ${paddingLeft + (trendData.length - 1) * stepX},${height - paddingBottom} Z`);
  areaPath.setAttribute('fill', 'url(#downloadsGrad)');
  svg.appendChild(areaPath);

  const pathDownloads = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  pathDownloads.setAttribute('d', `M ${pointsDownloads.join(' L ')}`);
  pathDownloads.setAttribute('fill', 'none'); pathDownloads.setAttribute('stroke', '#8b5cf6');
  pathDownloads.setAttribute('stroke-width', '3.5'); pathDownloads.setAttribute('stroke-linecap', 'round');
  pathDownloads.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(pathDownloads);

  trendData.forEach((d, index) => {
    const x = paddingLeft + index * stepX;
    const y = height - paddingBottom - (d.downloads / maxVal) * chartHeight;
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    glow.setAttribute('cx', x); glow.setAttribute('cy', y); glow.setAttribute('r', '5');
    glow.setAttribute('fill', '#8b5cf6'); glow.setAttribute('opacity', '0.4');
    svg.appendChild(glow);
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '3');
    dot.setAttribute('fill', '#ffffff');
    svg.appendChild(dot);
  });
}

function renderDonutChart(osBreakdown) {
  const svg = document.getElementById('svg-donut-chart');
  const legend = document.getElementById('donut-legend');
  svg.innerHTML = ''; legend.innerHTML = '';

  const total = (osBreakdown.win32 || 0) + (osBreakdown.darwin || 0) + (osBreakdown.linux || 0);
  document.getElementById('donut-total').innerText = total.toLocaleString('de-DE');

  if (total === 0) {
    const empty = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    empty.setAttribute('cx', '100'); empty.setAttribute('cy', '100'); empty.setAttribute('r', '65');
    empty.setAttribute('fill', 'transparent'); empty.setAttribute('stroke', 'rgba(255,255,255,0.05)');
    empty.setAttribute('stroke-width', '18');
    svg.appendChild(empty);
    return;
  }

  const data = [
    { label: 'Windows', count: osBreakdown.win32 || 0, color: '#2563eb' },
    { label: 'macOS', count: osBreakdown.darwin || 0, color: '#8b5cf6' },
    { label: 'Linux', count: osBreakdown.linux || 0, color: '#06b6d4' }
  ];

  const radius = 65, circumference = 2 * Math.PI * radius;
  let acc = 0;

  data.forEach(item => {
    if (item.count === 0) return;
    const pct = item.count / total;
    const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    segment.setAttribute('cx', '100'); segment.setAttribute('cy', '100'); segment.setAttribute('r', String(radius));
    segment.setAttribute('fill', 'transparent'); segment.setAttribute('stroke', item.color);
    segment.setAttribute('stroke-width', '18');
    segment.setAttribute('stroke-dasharray', `${circumference * pct} ${circumference * (1 - pct)}`);
    segment.setAttribute('stroke-dashoffset', String(circumference - circumference * acc));
    segment.setAttribute('stroke-linecap', 'round');
    svg.appendChild(segment);
    acc += pct;

    const row = document.createElement('div');
    row.className = 'donut-legend-row';
    row.innerHTML = `
      <div class="donut-legend-label">
        <span class="legend-dot" style="background:${item.color}"></span>
        <span>${item.label}</span>
      </div>
      <div class="donut-legend-val">${item.count.toLocaleString('de-DE')} (${(pct * 100).toFixed(1)}%)</div>
    `;
    legend.appendChild(row);
  });
}

function renderReleasesTable(releases, versionDownloads) {
  const tbody = document.getElementById('releases-table-body');
  tbody.innerHTML = '';

  if (!releases || releases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Keine Release-Daten von GitHub empfangen.</td></tr>`;
    return;
  }

  releases.forEach(release => {
    const pubDate = new Date(release.publishedAt).toLocaleDateString('de-DE', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const versionNum = release.tag.replace(/^v/, '');
    const appUpdatesCount = versionDownloads[versionNum] || 0;

    let assetsHtml = '';
    (release.assets || []).forEach(asset => {
      let icon = 'file-code';
      if (asset.name.endsWith('.exe')) icon = 'monitor';
      if (asset.name.endsWith('.dmg') || asset.name.endsWith('.zip')) icon = 'laptop';
      if (asset.name.endsWith('.AppImage') || asset.name.endsWith('.deb')) icon = 'terminal';
      assetsHtml += `
        <span class="asset-badge" title="${asset.name} (${(asset.size / (1024 * 1024)).toFixed(1)} MB)">
          <i data-lucide="${icon}" style="width:10px;height:10px;display:inline-block;vertical-align:middle;margin-right:2px;"></i>
          ${asset.name.substring(0, 24)}...
          <span class="badge-count">${asset.downloadCount} dl</span>
        </span>`;
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="version-tag">${release.tag}</span></td>
      <td>${pubDate}</td>
      <td style="font-weight:700;color:var(--omega-cyan)">${release.downloadCount.toLocaleString('de-DE')} <span style="font-size:.75rem;color:var(--text-muted);font-weight:normal;">Downloads</span></td>
      <td>
        <div style="margin-bottom:.5rem;font-size:.75rem;color:var(--text-secondary)">
          <strong>In-App Updates:</strong> <span style="color:var(--omega-purple);font-weight:700">${appUpdatesCount}</span> Installationen
        </div>
        <div>${assetsHtml || 'Keine Assets'}</div>
      </td>`;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

// ============================================================
//  NEW VISUALIZATIONS (GEO & HARDWARE & USERS)
// ============================================================

function renderGeoList(geoList) {
  const container = document.getElementById('geo-list-body');
  container.innerHTML = '';

  if (!geoList || geoList.length === 0) {
    container.innerHTML = `<div class="text-muted italic text-center py-4">Noch keine Standorte erfasst.</div>`;
    return;
  }

  geoList.forEach(geo => {
    const flag = getFlagEmoji(geo.code);
    const row = document.createElement('div');
    row.className = 'geo-row';
    row.innerHTML = `
      <div class="geo-country-label">
        <span class="geo-flag">${flag}</span>
        <span class="geo-country-name">${geo.name}</span>
        <span class="geo-country-code">${geo.code}</span>
      </div>
      <div class="geo-values">
        <span class="geo-val-check">${geo.checks.toLocaleString('de-DE')} checks</span>
        <span class="geo-val-dl">${geo.downloads.toLocaleString('de-DE')} updates</span>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderHardwareRankings(hardware, totalUsers) {
  renderSpecList('hw-ram-list', hardware.ram, totalUsers);
  renderSpecList('hw-gpu-list', hardware.gpu, totalUsers);
  renderSpecList('hw-cpu-list', hardware.cpu, totalUsers);
}

function renderSpecList(elementId, distribution, totalUsers) {
  const container = document.getElementById(elementId);
  container.innerHTML = '';

  if (!distribution || Object.keys(distribution).length === 0 || totalUsers === 0) {
    container.innerHTML = `<div class="text-muted italic py-2">Keine Gerätedaten vorhanden.</div>`;
    return;
  }

  // Sortiere Rankings absteigend
  const sorted = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4); // Top 4 anzeigen

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  sorted.forEach(([name, count]) => {
    const pctFill = (count / maxCount) * 100;
    const pctLabel = ((count / totalUsers) * 100).toFixed(0) + '%';
    
    const row = document.createElement('div');
    row.className = 'spec-item-bar';
    row.innerHTML = `
      <div class="spec-fill" style="width: ${pctFill}%"></div>
      <span class="spec-name" title="${name}">${name}</span>
      <span class="spec-count">${count} (${pctLabel})</span>
    `;
    container.appendChild(row);
  });
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Keine User-Profile registriert.</td></tr>`;
    return;
  }

  users.forEach(u => {
    const flag = getFlagEmoji(u.geo.countryCode);
    const osClean = u.os === 'win32' ? 'Windows' : u.os === 'darwin' ? 'macOS' : u.os === 'linux' ? 'Linux' : u.os;
    const locationStr = u.geo.city ? `${flag} ${u.geo.city}, ${u.geo.countryCode}` : `${flag} ${u.geo.country}`;
    
    // Hardware String
    const sp = u.specs;
    const hardwareStr = `
      <span class="spec-pill" title="Prozessor">CPU: <strong>${sp.cpu.replace('(R)', '').replace('(TM)', '').replace('Processor', '').substring(0, 20)}</strong></span>
      <span class="spec-pill" title="Grafikkarte">GPU: <strong>${sp.gpu.replace('/PCIe/SSE2', '').substring(0, 20)}</strong></span>
      <span class="spec-pill" title="Arbeitsspeicher">RAM: <strong>${sp.ramGB} GB</strong></span>
      <span class="spec-pill" title="SSD Hauptplatte">SSD: <strong>${sp.diskGB > 0 ? sp.diskGB + ' GB' : 'Unbekannt'}</strong></span>
    `;

    // Activity Status
    const isOnline = Date.now() - u.lastSeen < 120000; // Letzte 2 Minuten = Aktiv
    const statusClass = isOnline ? 'activity-active' : 'activity-inactive';
    const statusLabel = isOnline ? 'Online' : 'Offline';
    const lastSeenStr = new Date(u.lastSeen).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    // Version Transitions
    let transitionsHtml = '';
    (u.transitions || []).forEach(t => {
      transitionsHtml += `<span class="transition-pill">${t}</span>`;
    });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="client-id-label" title="${u.clientId}">${u.clientId}</span>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">OS: <strong>${osClean}</strong></div>
      </td>
      <td>
        <div style="font-weight: 500;">${locationStr}</div>
      </td>
      <td>
        <div style="max-width: 380px;">${hardwareStr}</div>
      </td>
      <td>
        <span class="version-tag">v${u.lastVersion}</span>
      </td>
      <td>
        <div class="transition-list">${transitionsHtml || '<span style="color:var(--text-muted);font-size:0.75rem;">Keine Updates</span>'}</div>
      </td>
      <td>
        <span class="activity-badge ${statusClass}">${statusLabel}</span>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">Pings: <strong>${u.checksCount} checks / ${u.downloadsCount} dl</strong></div>
        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">Letzter Ping: ${lastSeenStr}</div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTerminalLogs(recentLogs) {
  const terminal = document.getElementById('terminal-body');
  terminal.innerHTML = '';

  if (!recentLogs || recentLogs.length === 0) {
    terminal.innerHTML = `<div class="text-muted italic">[Keine Telemetrie-Einträge vorhanden]</div>`;
    return;
  }

  recentLogs.forEach(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString('de-DE');
    const actionLabel = log.action === 'download' ? 'DOWNLOAD' : 'CHECK';
    const actionClass = log.action === 'download' ? 'download' : 'check';
    const osClean = log.os === 'win32' ? 'Windows' : log.os === 'darwin' ? 'macOS' : log.os === 'linux' ? 'Linux' : log.os;
    
    const flag = getFlagEmoji(log.geo?.countryCode);
    const loc = log.geo?.city ? `${flag} ${log.geo.city}` : '';
    
    // CPU/GPU Kurzinformation für Terminal
    const specsText = log.specs ? ` — CPU: ${log.specs.cpu.substring(0, 16)}... | GPU: ${log.specs.gpu.substring(0, 16)}... | RAM: ${log.specs.ramGB}GB` : '';

    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = `
      <span class="term-time">[${timeStr}]</span>
      <span class="term-ip" title="Client ID: ${log.clientId}">client_${log.ipHash}</span>
      <span class="term-os">[${osClean}] ${loc}</span>
      <span class="term-action ${actionClass}">${actionLabel}</span>
      <span class="term-text">v${log.version}${specsText}</span>`;
    terminal.appendChild(line);
  });

  scrollTerminalToBottom();
}

function scrollTerminalToBottom() {
  const terminal = document.getElementById('terminal-body');
  if (terminal) terminal.scrollTop = terminal.scrollHeight;
}

// ============================================================
//  FEEDBACK & SUPPORT
// ============================================================
let currentTickets = [];
let selectedTicketId = null;
let feedbackPollInterval = null;

async function fetchAndRenderTickets() {
  try {
    const res = await authedFetch('/api/admin/feedback');
    if (!res.ok) throw new Error('Fehler beim Laden der Tickets');
    const data = await res.json();
    currentTickets = data.tickets || [];
    renderTicketsList();
    
    // Refresh detail view if a ticket is currently selected
    if (selectedTicketId) {
      const updatedTicket = currentTickets.find(t => t.id === selectedTicketId);
      if (updatedTicket) {
        renderTicketDetail(updatedTicket);
      }
    }
  } catch (err) {
    console.error('[Feedback] error loading tickets:', err);
  }
}

function renderTicketsList() {
  const container = document.getElementById('tickets-list');
  if (!container) return;

  const projectFilter = document.getElementById('filter-project').value;
  const typeFilter = document.getElementById('filter-type').value;
  const statusFilter = document.getElementById('filter-status').value;

  const filtered = currentTickets.filter(t => {
    if (projectFilter !== 'all' && t.project !== projectFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="text-center text-muted py-4">Keine Tickets gefunden.</div>`;
    return;
  }

  container.innerHTML = '';
  filtered.forEach(t => {
    const dateStr = new Date(t.createdAt).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
    
    const div = document.createElement('div');
    div.className = `ticket-item ${t.id === selectedTicketId ? 'selected' : ''} ${t.status === 'closed' ? 'closed' : ''}`;
    div.innerHTML = `
      <div class="ticket-item-header">
        <span class="type-badge ${t.type}">${t.type.toUpperCase()}</span>
        <span class="ticket-date">${dateStr}</span>
      </div>
      <h3 class="ticket-title" title="${t.title}">${t.title}</h3>
      <div class="ticket-meta">
        <span>${t.project}</span>
        <span class="status-dot ${t.status}"></span>
      </div>
    `;

    div.addEventListener('click', () => {
      document.querySelectorAll('.ticket-item').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      selectTicket(t.id);
    });

    container.appendChild(div);
  });
}

function selectTicket(ticketId) {
  selectedTicketId = ticketId;
  const ticket = currentTickets.find(t => t.id === ticketId);
  if (ticket) {
    renderTicketDetail(ticket);
  }
}

function renderTicketDetail(ticket) {
  document.getElementById('ticket-detail-empty').classList.add('hidden');
  const content = document.getElementById('ticket-detail-content');
  content.classList.remove('hidden');

  // Fill Header
  const typeBadge = document.getElementById('ticket-detail-type');
  typeBadge.className = `type-badge ${ticket.type}`;
  typeBadge.textContent = ticket.type.toUpperCase();

  document.getElementById('ticket-detail-title').textContent = ticket.title;

  const statusBadge = document.getElementById('ticket-detail-status');
  statusBadge.className = `status-badge-inline ${ticket.status}`;
  statusBadge.textContent = ticket.status.toUpperCase();

  document.getElementById('ticket-detail-project').innerHTML = `<b>Projekt:</b> ${ticket.project}`;
  document.getElementById('ticket-detail-device').innerHTML = `<b>Device ID:</b> ${ticket.deviceId}`;
  
  const osClean = ticket.os === 'win32' ? 'Windows' : ticket.os === 'darwin' ? 'macOS' : ticket.os === 'linux' ? 'Linux' : ticket.os;
  document.getElementById('ticket-detail-os').innerHTML = `<b>System:</b> ${osClean} (v${ticket.version})`;
  
  const dateStr = new Date(ticket.createdAt).toLocaleString('de-DE');
  document.getElementById('ticket-detail-date').innerHTML = `<b>Erstellt:</b> ${dateStr}`;

  // Description
  document.getElementById('ticket-detail-desc').textContent = ticket.description;

  // Images
  const attachmentsSection = document.getElementById('attachments-section');
  const imagesGrid = document.getElementById('ticket-detail-images');
  imagesGrid.innerHTML = '';
  if (ticket.images && ticket.images.length > 0) {
    attachmentsSection.classList.remove('hidden');
    ticket.images.forEach((imgBase64, idx) => {
      const img = document.createElement('img');
      img.src = imgBase64;
      img.alt = `Screenshot ${idx + 1}`;
      img.className = 'ticket-detail-image';
      img.addEventListener('click', () => {
        const w = window.open();
        w.document.write(`<img src="${imgBase64}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
      });
      imagesGrid.appendChild(img);
    });
  } else {
    attachmentsSection.classList.add('hidden');
  }

  // Logs
  const logsSection = document.getElementById('logs-section');
  if (ticket.logs && ticket.logs.trim().length > 0) {
    logsSection.classList.remove('hidden');
    document.getElementById('ticket-detail-logs').textContent = ticket.logs;
  } else {
    logsSection.classList.add('hidden');
  }

  // Chat history
  const chatMessages = document.getElementById('chat-messages');
  chatMessages.innerHTML = '';
  
  if (ticket.chat && ticket.chat.length > 0) {
    ticket.chat.forEach(msg => {
      const timeStr = new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg ${msg.sender}`;
      msgDiv.innerHTML = `
        <div class="chat-msg-bubble">
          <div class="chat-msg-text">${msg.text}</div>
          <div class="chat-msg-time">${timeStr}</div>
        </div>
      `;
      chatMessages.appendChild(msgDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    chatMessages.innerHTML = `<div class="text-center text-muted py-4 italic">Noch keine Chat-Nachrichten vorhanden. Schreib eine Antwort unten!</div>`;
  }

  // Close form actions if ticket is closed
  const chatReplyForm = document.getElementById('chat-reply-form');
  const btnClose = document.getElementById('btn-close-ticket');
  if (ticket.status === 'closed') {
    btnClose.style.display = 'none';
    chatReplyForm.classList.add('ticket-closed-state');
  } else {
    btnClose.style.display = 'inline-flex';
    chatReplyForm.classList.remove('ticket-closed-state');
  }

  lucide.createIcons();
}

async function sendSupportReply() {
  if (!selectedTicketId) return;
  const textarea = document.getElementById('chat-reply-input');
  const text = textarea.value.trim();
  if (!text) return;

  const btnSend = document.getElementById('btn-send-reply');
  btnSend.disabled = true;

  try {
    const res = await authedFetch('/api/admin/feedback/reply', {
      method: 'POST',
      body: JSON.stringify({ ticketId: selectedTicketId, text })
    });
    if (res.ok) {
      textarea.value = '';
      await fetchAndRenderTickets();
    } else {
      alert('Antwort konnte nicht gesendet werden.');
    }
  } catch (err) {
    console.error(err);
    alert('Verbindungsfehler beim Senden.');
  } finally {
    btnSend.disabled = false;
  }
}

async function closeSupportTicket() {
  if (!selectedTicketId) return;
  if (!confirm('Möchtest du dieses Ticket wirklich schließen?')) return;

  const btnClose = document.getElementById('btn-close-ticket');
  btnClose.disabled = true;

  try {
    const res = await authedFetch('/api/admin/feedback/close', {
      method: 'POST',
      body: JSON.stringify({ ticketId: selectedTicketId })
    });
    if (res.ok) {
      await fetchAndRenderTickets();
    } else {
      alert('Ticket konnte nicht geschlossen werden.');
    }
  } catch (err) {
    console.error(err);
    alert('Verbindungsfehler.');
  } finally {
    btnClose.disabled = false;
  }
}

// ============================================================
//  BOOT
// ============================================================
tryAutoLogin();
