/* The shop server: pulls website requests and analytics. The server address is set at deploy time (the portal-api meta tag,
   which the page's Content-Security-Policy also names). The access token is typed in by the owner, kept for this tab only,
   and never written to storage that outlives the tab, to the console, or to the page. */
(function () {
  'use strict';
  var OA = window.OA, S = OA.store, act = OA.act, ui = OA.ui;
  var TOKEN_KEY = 'oa2:apitoken', POLL_MS = 90000, MAX_PAGES = 20, busy = null, timer = null;

  function base() {
    var m = document.querySelector('meta[name="portal-api"]'), v = m ? (m.getAttribute('content') || '').trim() : '';
    if (!v) return '';
    try { var u = new URL(v), local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'; return (u.protocol === 'https:' || (u.protocol === 'http:' && local)) ? u.origin : ''; } catch (e) { return ''; }
  }
  function state() { var s = S.state.settings; if (!s.api) s.api = { after: 0, lastOk: null, lastError: '', added: 0 }; return s.api; }
  function getToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }

  var api = OA.api = {
    base: base,
    configured: function () { return !!base(); },
    hasToken: function () { return !!getToken(); },
    setToken: function (t) { try { sessionStorage.setItem(TOKEN_KEY, String(t || '').trim()); return true; } catch (e) { return false; } },
    clearToken: function () { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* nothing stored */ } },
    state: state,
    ready: function () { return api.configured() && api.hasToken(); },

    call: function (path) {
      if (!api.configured()) return Promise.reject(new Error('This portal is not pointed at a shop server yet.'));
      var t = getToken();
      if (!t) return Promise.reject(new Error('Enter the access token in Settings first.'));
      return fetch(base() + path, { headers: { Authorization: 'Bearer ' + t }, cache: 'no-store' }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (r.ok && j) return j;
          if (r.status === 401) throw new Error('The access token was not accepted. Check it in Settings.');
          if (r.status === 429) throw new Error('Too many tries. Wait a few minutes.');
          throw new Error((j && typeof j.error === 'string' && j.error) || 'The shop server answered with an error (' + r.status + ').');
        });
      }, function () { throw new Error('Could not reach the shop server. Check the connection, then try again.'); });
    },

    /* Pull every request newer than the saved cursor. Safe to run twice: requests carry the server's id and are skipped if already here. */
    pull: function () {
      if (busy) return busy;
      var st = state(), added = 0;
      function page(n) {
        if (n >= MAX_PAGES) return Promise.resolve();
        return api.call('/api/requests?limit=100&after=' + encodeURIComponent(st.after || 0)).then(function (j) {
          if (!j || !Array.isArray(j.requests)) throw new Error('The shop server sent something this portal does not recognize.');
          added += act.importRemote(j.requests, j.next_after);
          return j.requests.length >= 100 ? page(n + 1) : undefined;
        });
      }
      busy = page(0).then(function () { st.lastOk = Date.now(); st.lastError = ''; S.commit(); return { added: added }; },
        function (e) { st.lastError = e.message; S.commit(); throw e; }).then(function (r) { busy = null; return r; }, function (e) { busy = null; throw e; });
      return busy;
    },

    analytics: function (days) { return api.call('/api/analytics?days=' + encodeURIComponent(days)); },

    callPost: function (path, body) {
      if (!api.configured()) return Promise.reject(new Error('This portal is not pointed at a shop server yet.'));
      var t = getToken();
      if (!t) return Promise.reject(new Error('Enter the access token in Settings first.'));
      return fetch(base() + path, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), cache: 'no-store' }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (r.ok && j) return j;
          if (r.status === 401) throw new Error('The access token was not accepted. Check it in Settings.');
          if (r.status === 429) throw new Error('Too many tries. Wait a few minutes.');
          throw new Error((j && typeof j.error === 'string' && j.error) || 'The shop server answered with an error (' + r.status + ').');
        });
      }, function () { throw new Error('Could not reach the shop server. Check the connection, then try again.'); });
    },

    /* Ask the shop server to draft a description (and an SEO file name) for one
       portfolio photo. The server holds the Vision key; the owner always reads
       and edits the draft before the photo can be shown. */
    describe: function (item) {
      function photoBlob() {
        if (!item || !item.src) return Promise.resolve(null);
        if (String(item.src).indexOf('idb:') === 0) return OA.img.blob(item.src);
        return fetch(OA.img.src(item.src), { cache: 'no-store' }).then(function (r) { return r.ok ? r.blob() : null; }).catch(function () { return null; });
      }
      function toB64(blob) {
        return new Promise(function (res, rej) {
          var fr = new FileReader();
          fr.onload = function () { res(String(fr.result).split(',')[1] || ''); };
          fr.onerror = function () { rej(new Error('That photo could not be read.')); };
          fr.readAsDataURL(blob);
        });
      }
      return photoBlob().then(function (blob) {
        if (!blob) throw new Error('That photo could not be read.');
        return toB64(blob);
      }).then(function (b64) {
        return api.callPost('/api/describe', { image: b64 });
      }).then(function (j) {
        if (!j || typeof j.description !== 'string' || !j.description) throw new Error('The description service sent something this portal does not recognize.');
        return { description: j.description, fileName: typeof j.fileName === 'string' ? j.fileName : '' };
      });
    },

    /* One line for the Requests header. Never says all is well unless the last check worked. */
    status: function () {
      var st = state();
      if (!api.configured()) return { kind: 'quiet', text: 'Website form not connected', detail: 'Requests from the website will not show up here until the portal is pointed at the shop server.' };
      if (!api.hasToken()) return { kind: 'warn', text: 'Website form: enter the access token', detail: 'Open Settings, then Website connection.' };
      if (st.lastError) return { kind: 'bad', text: 'Last check failed', detail: st.lastError };
      if (st.lastOk) return { kind: 'ok', text: 'Checked ' + OA.ago(st.lastOk), detail: '' };
      return { kind: 'quiet', text: 'Not checked yet', detail: '' };
    },

    startPolling: function () {
      if (timer) return;
      timer = setInterval(function () {
        if (document.hidden || !api.ready()) return;
        api.pull().then(function (r) {
          if (r.added) { ui.toast(OA.plural(r.added, 'new website request') + ' came in.'); var t = (location.hash.split('/')[1] || '').split('?')[0]; if (t === 'requests' || t === 'today') OA.rerender(); }
        }, function () { /* the failure shows in the Requests header */ });
      }, POLL_MS);
    }
  };
})();
