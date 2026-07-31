(() => {
  'use strict';

  const MODE_KEY = 'iekei-map-ui';
  const SORT_KEY = 'iekei-map-a-sort';
  const CARD_MAP_BEHAVIOR_KEY = 'iekei-map-a-card-map-behavior';
  const MAP_LABEL_MIN_ZOOM = 12;
  const MAP_LABEL_MAX_GRAPHEMES = 4;
  const MAP_LABEL_OFFSET_Y = 8;
  const MAP_SELECTED_LABEL_OFFSET_Y = 13;
  const CARD_ZOOM_OUT_MAX_STEPS = 2;
  const CARD_ZOOM_OUT_MIN_ZOOM = 9;
  const MAX_RAIL_SHOPS = 30;
  const MAP_FOCUS_Y_RATIO = 0.43;
  const PLACE_SEARCH_DELAY = 360;
  const SEARCH_HISTORY_STATE = 'mapDiscoverySearch';

  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path stroke-linecap="round" d="m20 20-4-4"></path></svg>',
    location: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>',
    tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M14 4v6M4 17h2M10 17h10M6 14v6"></path></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"></path></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"></path><path d="M9 3v15M15 6v15"></path></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',
    xmark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.2 3h2.9l-6.4 7.3L22 21h-5.7l-4.5-5.9L6.7 21H3.8l6.6-7.6L3.4 3h5.9l4.1 5.4L18.2 3Zm-1 16.1h1.6L8.4 4.8H6.7l10.5 14.3Z"></path></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>'
  };

  const state = {
    sort: readStoredValue(SORT_KEY, ['center', 'current', 'open', 'name'], 'center'),
    cardMapBehavior: readStoredValue(CARD_MAP_BEHAVIOR_KEY, ['keep', 'zoomout'], 'zoomout'),
    adjustTab: 'filter',
    activeShopId: null,
    visibleShops: [],
    totalShopCount: 0,
    placeResults: [],
    searchTab: 'shops',
    placeLoading: false,
    placeError: '',
    placeSequence: 0,
    placeController: null,
    placeTimer: 0,
    mapMoveTimer: 0,
    refreshFrame: 0,
    programmaticMapMove: '',
    programmaticClearTimer: 0,
    mapHooksTarget: null,
    mapGestureSource: '',
    mapGestureStartCenter: null,
    mapGestureStartZoom: null,
    zoomMoveEndPending: false,
    railGestureStartIndex: null,
    railGestureStartX: 0,
    railSettleTimer: 0,
    suppressRailUntil: 0,
    suppressCardClickUntil: 0,
    forceShopId: null,
    warnedLongLabels: new Set(),
    cardPhotos: new Map(),
    cardPhotoLoading: new Set(),
    cardPhotoHydrated: new Set(),
    detailPhotoLoading: new Map(),
    detailPhotoHydrated: new Set()
  };

  let mapShopLabels = {};
  let selectedShopIndicator = null;
  let labelSegmenter = null;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      labelSegmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    }
  } catch (_) {
    labelSegmenter = null;
  }

  const initialMode = resolveInitialMode();
  document.documentElement.dataset.mapUi = initialMode;

  try {
    ensureUiMarkup();
    bindUiEvents();
    patchClassicMapFunctions();
    syncAllControls();
  } catch (error) {
    document.documentElement.dataset.mapUi = 'classic';
    console.error('Map Discovery UIの初期化に失敗したためクラシック表示へ戻しました:', error);
  }

  function resolveInitialMode() {
    try {
      const queryValue = new URLSearchParams(window.location.search).get('mapUi');
      if (queryValue === 'a' || queryValue === 'classic') return queryValue;
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === 'a' || saved === 'classic') return saved;
    } catch (_) {}
    return 'a';
  }

  function readStoredValue(key, allowed, fallback) {
    try {
      const value = localStorage.getItem(key);
      return allowed.includes(value) ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function isMapUiA() {
    return document.documentElement.dataset.mapUi === 'a';
  }

  function ensureUiMarkup() {
    const mapContainer = document.querySelector('#tab-map .map-container');
    if (!mapContainer) throw new Error('map-containerが見つかりません');

    if (!document.getElementById('map-a-root')) {
      const root = document.createElement('section');
      root.id = 'map-a-root';
      root.className = 'map-a-root';
      root.setAttribute('aria-label', '新しいマップ探索UI');
      root.innerHTML = `
        <div id="map-a-color-legend" class="map-a-color-legend" role="region" aria-label="系統色の凡例">
          <span class="map-a-color-legend-title">系統</span>
          <div id="map-a-color-legend-items" class="map-a-color-legend-items"></div>
        </div>
        <div class="map-a-center-target" aria-hidden="true"><span>中心</span></div>
        <section class="map-a-card-region" aria-label="地図中心に近い店舗">
          <div class="map-a-card-head"><strong id="map-a-rail-heading">中心から近いお店</strong><span id="map-a-rail-position">0 / 0</span></div>
          <div id="map-a-card-rail" class="map-a-card-rail" tabindex="0"></div>
        </section>
        <div class="map-a-command-dock">
          <button id="map-a-search-trigger" class="map-a-search-trigger" type="button" aria-label="店舗名、駅名、地名を検索">
            ${icons.search}<span class="map-a-search-copy">店名・駅・地名を検索</span>
          </button>
          <button id="map-a-open-toggle" class="map-a-open-toggle is-active" type="button" aria-label="営業中の店舗だけ表示中。全店舗表示に戻す" aria-pressed="true"><span id="map-a-open-label">営業中</span></button>
          <button id="map-a-location-trigger" class="map-a-location-trigger" type="button" aria-label="現在地を表示" aria-pressed="false">
            ${icons.location}
          </button>
          <button id="map-a-adjust-trigger" class="map-a-adjust-trigger" type="button" aria-label="絞り込み、並び順、地図設定" aria-expanded="false">
            ${icons.tune}<span id="map-a-filter-label" class="map-a-filter-label" aria-hidden="true"></span>
          </button>
        </div>
        <button id="map-a-scrim" class="map-a-scrim" type="button" aria-label="表示の調整を閉じる"></button>
        ${renderAdjustPanelMarkup()}
      `;
      mapContainer.appendChild(root);
    }

    if (!document.getElementById('map-a-search-surface')) {
      const searchSurface = document.createElement('section');
      searchSurface.id = 'map-a-search-surface';
      searchSurface.className = 'map-a-search-surface';
      searchSurface.setAttribute('role', 'search');
      searchSurface.setAttribute('aria-hidden', 'true');
      searchSurface.setAttribute('aria-label', '全画面検索');
      searchSurface.innerHTML = `
        <div class="map-a-search-top">
          <div class="map-a-search-row">
            <button id="map-a-search-back" class="map-a-search-back" type="button" aria-label="マップへ戻る">${icons.back}</button>
            <div class="map-a-search-field-wrap">
              ${icons.search}
              <input id="map-a-search-input" class="map-a-search-input" type="search" enterkeyhint="search" autocomplete="off" placeholder="店名・駅名・地名">
              <button id="map-a-search-clear" class="map-a-search-clear" type="button" aria-label="検索文字を消去">×</button>
            </div>
          </div>
          <div class="map-a-search-tabs" role="tablist" aria-label="検索対象">
            <button class="map-a-search-tab is-active" type="button" role="tab" data-map-a-search-tab="shops" aria-selected="true">ラーメン店 <span id="map-a-shop-count">0</span></button>
            <button class="map-a-search-tab" type="button" role="tab" data-map-a-search-tab="places" aria-selected="false">地名・駅 <span id="map-a-place-count">0</span></button>
          </div>
        </div>
        <div id="map-a-search-results" class="map-a-search-results"></div>
      `;
      document.body.appendChild(searchSurface);
    }

    ensureSettingsControl();
  }

  function renderAdjustPanelMarkup() {
    return `
      <aside id="map-a-adjust-panel" class="map-a-adjust-panel" role="dialog" aria-modal="true" aria-hidden="true" aria-label="地図の調整">
        <div class="map-a-adjust-head">
          <div class="map-a-adjust-title"><strong>地図の調整</strong><span id="map-a-adjust-subtitle">表示する店舗を選ぶ</span></div>
          <button id="map-a-adjust-close" class="map-a-close-button" type="button" aria-label="閉じる">${icons.close}</button>
        </div>
        <div class="map-a-adjust-tabs" role="tablist" aria-label="調整項目">
          <button class="map-a-adjust-tab is-active" type="button" role="tab" data-map-a-adjust-tab="filter" aria-selected="true" aria-controls="map-a-adjust-pane-filter">絞り込み</button>
          <button class="map-a-adjust-tab" type="button" role="tab" data-map-a-adjust-tab="sort" aria-selected="false" aria-controls="map-a-adjust-pane-sort">並び順</button>
          <button class="map-a-adjust-tab" type="button" role="tab" data-map-a-adjust-tab="settings" aria-selected="false" aria-controls="map-a-adjust-pane-settings">地図設定</button>
        </div>
        <div class="map-a-adjust-body">
          <section id="map-a-adjust-pane-filter" class="map-a-adjust-pane is-active" role="tabpanel" data-map-a-adjust-pane="filter">
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">表示する店舗</h2>
              <div class="map-a-choice-list map-a-quick-filter-list" role="group" aria-label="表示する店舗">
                ${switchRow('map-a-filter-open', '営業中のみ', '今入れる店に絞る')}
                ${switchRow('map-a-filter-want', '行きたい', '保存した候補だけ表示')}
                ${switchRow('map-a-filter-favorite', 'お気に入り', 'お気に入りの店だけ表示')}
              </div>
            </div>
            <div class="map-a-control-group">
              <div class="map-a-control-title-row">
                <h2 class="map-a-control-title">系統</h2>
                <span id="map-a-category-summary" class="map-a-control-summary">家系</span>
              </div>
              <div class="map-a-category-groups">
                ${renderAdjustCategoryGroup('iekei', '家系')}
                ${renderAdjustCategoryGroup('isse', '壱系')}
              </div>
            </div>
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">曜日・時刻</h2>
              <div class="map-a-schedule-fields">
                <label class="map-a-schedule-field">
                  <span>曜日</span>
                  <select id="map-a-filter-day">
                    <option value="">指定なし</option>
                    <option value="0">日曜日</option>
                    <option value="1">月曜日</option>
                    <option value="2">火曜日</option>
                    <option value="3">水曜日</option>
                    <option value="4">木曜日</option>
                    <option value="5">金曜日</option>
                    <option value="6">土曜日</option>
                  </select>
                </label>
                <label class="map-a-schedule-field">
                  <span>時刻</span>
                  <input id="map-a-filter-time" type="time" aria-label="営業時間で絞り込む時刻">
                </label>
              </div>
              <p class="map-a-schedule-help">曜日と時刻を両方指定すると、その時間に営業する店舗へ絞ります。</p>
            </div>
          </section>
          <section id="map-a-adjust-pane-sort" class="map-a-adjust-pane" role="tabpanel" data-map-a-adjust-pane="sort" hidden>
            <div class="map-a-control-group">
            <h2 class="map-a-control-title">カードの並び順</h2>
            <div class="map-a-choice-list">
              ${radioRow('map-a-sort', 'center', '地図の中心に近い順', '地図を動かした後に近い順へ更新')}
              ${radioRow('map-a-sort', 'current', '現在地・指定地点に近い順', '位置を指定している時に利用できます')}
              ${radioRow('map-a-sort', 'open', '営業中を優先', '営業中の店を距離順で先に表示')}
              ${radioRow('map-a-sort', 'name', '店名 あ→ん', '店舗名の五十音順')}
            </div>
            </div>
          </section>
          <section id="map-a-adjust-pane-settings" class="map-a-adjust-pane" role="tabpanel" data-map-a-adjust-pane="settings" hidden>
            <div class="map-a-control-group">
              <h2 class="map-a-control-title">カード切替時の地図</h2>
              <div class="map-a-choice-list">
                ${radioRow('map-a-card-map', 'zoomout', '範囲を広げる', '画面外の時だけ中心固定で最大2段階縮小')}
                ${radioRow('map-a-card-map', 'keep', '中心を固定', 'カードをめくっても地図を一切動かさない')}
              </div>
            </div>
          </section>
        </div>
        <div class="map-a-adjust-footer">
          <button id="map-a-reset" class="map-a-reset-button" type="button">リセット</button>
          <button id="map-a-apply" class="map-a-apply-button" type="button">完了・<span id="map-a-draft-count">0</span>店表示中</button>
        </div>
      </aside>`;
  }

  function radioRow(name, value, title, helper) {
    return `<label class="map-a-choice-row"><span class="map-a-choice-copy"><strong>${title}</strong><span>${helper}</span></span><input type="radio" name="${name}" value="${value}"></label>`;
  }

  function switchRow(id, title, helper) {
    return `<label class="map-a-switch-row"><span class="map-a-choice-copy"><strong>${title}</strong><span>${helper}</span></span><input id="${id}" type="checkbox"></label>`;
  }

  function getAdjustCategoryOptions(group) {
    return Array.from(document.querySelectorAll(`#advanced-filter-modal input.category-${group}`)).map(input => ({
      value: String(input.value || '').trim(),
      label: input.closest('label')?.querySelector('span')?.textContent?.trim() || String(input.value || '').trim()
    })).filter(option => option.value);
  }

  function renderAdjustCategoryGroup(group, title) {
    const options = getAdjustCategoryOptions(group);
    const buttons = options.map(option => {
      const color = typeof getMapCategoryColor === 'function' ? getMapCategoryColor(option.value) : '#64748b';
      return `<button class="map-a-category-chip" type="button" data-map-a-category="${escapeMarkup(option.value)}" aria-pressed="false" style="--map-a-category-color:${escapeMarkup(color)}"><span class="map-a-category-dot" aria-hidden="true"></span><span>${escapeMarkup(option.label)}</span></button>`;
    }).join('');
    return `<section class="map-a-category-group" aria-label="${escapeMarkup(title)}">
      <div class="map-a-category-group-head">
        <strong>${escapeMarkup(title)}</strong>
        <button class="map-a-category-group-toggle" type="button" data-map-a-category-group="${escapeMarkup(group)}" aria-pressed="false">${escapeMarkup(title)}をすべて</button>
      </div>
      <div class="map-a-category-grid" role="group" aria-label="${escapeMarkup(title)}の系統">${buttons}</div>
    </section>`;
  }

  function getAllAdjustCategoryValues() {
    return ['iekei', 'isse'].flatMap(group => getAdjustCategoryOptions(group).map(option => option.value));
  }

  function getEffectiveAdjustCategorySelection() {
    const stored = advancedFilterSettings?.categories || [];
    return new Set(stored.length ? stored : getAllAdjustCategoryValues());
  }

  function storeAdjustCategorySelection(selected) {
    const allValues = getAllAdjustCategoryValues();
    advancedFilterSettings.categories = allValues.length > 0 && allValues.every(value => selected.has(value))
      ? []
      : allValues.filter(value => selected.has(value));
  }

  function escapeMarkup(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureSettingsControl() {
    const accountItem = document.getElementById('settings-account-menu-item');
    const parent = accountItem?.parentElement;
    if (!parent || document.getElementById('map-ui-mode-setting')) return;
    const setting = document.createElement('section');
    setting.id = 'map-ui-mode-setting';
    setting.className = 'map-ui-mode-setting';
    setting.innerHTML = `
      <div class="map-ui-mode-setting-head">
        <div class="map-ui-mode-setting-icon" aria-hidden="true">🗺️</div>
        <div class="map-ui-mode-setting-copy"><strong>マップのデザイン</strong><span>いつでも旧表示へ戻せます</span></div>
      </div>
      <div class="map-ui-mode-segments" role="group" aria-label="マップのデザイン">
        <button class="map-ui-mode-segment" type="button" data-map-ui-mode="a">新デザイン</button>
        <button class="map-ui-mode-segment" type="button" data-map-ui-mode="classic">クラシック</button>
      </div>`;
    accountItem.insertAdjacentElement('afterend', setting);
  }

  function bindUiEvents() {
    const root = document.getElementById('map-a-root');
    if (!root || root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    document.getElementById('map-a-search-trigger')?.addEventListener('click', openSearchSurface);
    document.getElementById('map-a-open-toggle')?.addEventListener('click', toggleOpenOnlyImmediately);
    document.getElementById('map-a-location-trigger')?.addEventListener('click', handleCurrentLocationClick);
    document.getElementById('map-a-adjust-trigger')?.addEventListener('click', openAdjustPanel);
    document.getElementById('map-a-adjust-close')?.addEventListener('click', closeAdjustPanel);
    document.getElementById('map-a-scrim')?.addEventListener('click', closeAdjustPanel);
    document.getElementById('map-a-reset')?.addEventListener('click', resetAdjustDraft);
    document.getElementById('map-a-apply')?.addEventListener('click', closeAdjustPanel);
    document.querySelectorAll('[data-map-a-adjust-tab]').forEach(button => {
      button.addEventListener('click', () => switchAdjustTab(button.dataset.mapAAdjustTab));
    });
    document.querySelectorAll('[data-map-a-category], [data-map-a-category-group]').forEach(button => {
      button.addEventListener('click', handleAdjustCategoryClick);
    });
    document.getElementById('map-a-color-legend-items')?.addEventListener('click', handleLegendCategoryClick);
    document.querySelectorAll('#map-a-adjust-panel input, #map-a-adjust-panel select').forEach(control => {
      control.addEventListener('change', handleAdjustInputChange);
    });

    const rail = document.getElementById('map-a-card-rail');
    rail?.addEventListener('pointerdown', beginRailGesture, { passive: true });
    rail?.addEventListener('pointerup', finishRailGesture, { passive: true });
    rail?.addEventListener('pointercancel', cancelRailGesture, { passive: true });
    rail?.addEventListener('scroll', handleRailScroll, { passive: true });
    rail?.addEventListener('scrollend', handleRailScrollEnd, { passive: true });
    rail?.addEventListener('click', handleRailClick);
    rail?.addEventListener('keydown', event => {
      if (event.target !== rail || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      const activeIndex = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      settleRailAt(Math.max(0, Math.min(state.visibleShops.length - 1, activeIndex + direction)), true, true);
    });

    document.getElementById('map-a-search-back')?.addEventListener('click', closeSearchSurface);
    const searchInput = document.getElementById('map-a-search-input');
    searchInput?.addEventListener('input', () => {
      if (state.searchTab === 'places') schedulePlaceSearch();
      else {
        cancelPlaceSearch(false);
        renderSearchResults();
      }
    });
    searchInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && state.searchTab === 'places') {
        event.preventDefault();
        runPlaceSearch(searchInput.value.trim());
      }
    });
    document.getElementById('map-a-search-clear')?.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = '';
      cancelPlaceSearch(true);
      state.placeError = '';
      renderSearchResults();
      searchInput.focus();
    });
    document.querySelectorAll('[data-map-a-search-tab]').forEach(button => {
      button.addEventListener('click', () => setSearchTab(button.dataset.mapASearchTab));
    });
    document.getElementById('map-a-search-results')?.addEventListener('click', handleSearchResultClick);

    document.querySelectorAll('[data-map-ui-mode]').forEach(button => {
      button.addEventListener('click', () => setMapUiMode(button.dataset.mapUiMode));
    });

    document.querySelectorAll('.bottom-nav .nav-item').forEach(button => {
      button.addEventListener('click', closeAdjustPanel);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (document.getElementById('map-a-search-surface')?.classList.contains('is-open')) closeSearchSurface();
      else closeAdjustPanel();
    });

    window.addEventListener('popstate', () => {
      const isOpen = document.getElementById('map-a-search-surface')?.classList.contains('is-open');
      if (isOpen && !history.state?.[SEARCH_HISTORY_STATE]) {
        closeSearchSurface({ fromHistory: true });
      } else if (!isOpen && history.state?.[SEARCH_HISTORY_STATE] && isMapUiA()) {
        openSearchSurface({ fromHistory: true });
      } else if (history.state?.[SEARCH_HISTORY_STATE] && !isMapUiA()) {
        clearSearchHistoryFlag();
      }
    });

    if (history.state?.[SEARCH_HISTORY_STATE]) {
      if (isMapUiA()) openSearchSurface({ fromHistory: true });
      else clearSearchHistoryFlag();
    }
  }

  function patchClassicMapFunctions() {
    if (window.__mapDiscoveryV2Patched) return;
    window.__mapDiscoveryV2Patched = true;

    if (typeof initMap === 'function') {
      const classicInitMap = initMap;
      initMap = function mapDiscoveryInitMap(...args) {
        // The app may initialize once from cache and again after a fresh API response.
        if (map?.getContainer?.()) {
          updateMarkers();
          installMapHooks();
          scheduleRailRefresh({ preserveActive: true });
          return map;
        }
        const result = classicInitMap.apply(this, args);
        installMapHooks();
        scheduleRailRefresh({ selectFirst: true, resetScroll: true });
        return result;
      };
    }

    if (typeof updateMarkers === 'function') {
      const classicUpdateMarkers = updateMarkers;
      updateMarkers = function mapDiscoveryUpdateMarkers(...args) {
        clearMapShopLabels();
        const result = classicUpdateMarkers.apply(this, args);
        ensureForcedMarker();
        installMapHooks();
        decorateCurrentMarkers();
        rebuildMapShopLabels();
        syncMapShopLabels();
        scheduleRailRefresh({ preserveActive: true });
        return result;
      };
    }

    if (typeof renderShopList === 'function') {
      const classicRenderShopList = renderShopList;
      renderShopList = function mapDiscoveryRenderShopList(...args) {
        const result = classicRenderShopList.apply(this, args);
        scheduleRailRefresh({ preserveActive: true });
        return result;
      };
    }

    if (typeof focusShop === 'function') {
      const classicFocusShop = focusShop;
      focusShop = function mapDiscoveryFocusShop(shopId) {
        if (!isMapUiA()) return classicFocusShop.call(this, shopId);
        const shop = findShop(shopId);
        if (!shop || !map) return;
        state.forceShopId = shop.id;
        renderRail({ preserveActive: true, scrollToShopId: shop.id });
        selectMapShop(shop.id);
        if (!isShopInSafeArea(shop)) {
          markProgrammaticMapMove('external-focus');
          panShopIntoSafeArea(shop, true);
        }
      };
    }

    if (typeof openSettingsModal === 'function') {
      const classicOpenSettings = openSettingsModal;
      openSettingsModal = function mapDiscoveryOpenSettings(...args) {
        syncMapUiSetting();
        return classicOpenSettings.apply(this, args);
      };
    }

  }

  function installMapHooks() {
    if (!map || state.mapHooksTarget === map) return;
    state.mapHooksTarget = map;
    ensureMapShopLabelPane();
    map.on('zoomstart', handleMapZoomStart);
    map.on('zoomend', handleMapZoomEnd);
    map.on('moveend', handleMapMoveEnd);
    map.on('dragstart', handleMapDragStart);
  }

  function handleMapZoomStart() {
    window.clearTimeout(state.mapMoveTimer);
    state.mapGestureSource = 'zoom';
    state.mapGestureStartCenter = null;
    state.mapGestureStartZoom = null;
    state.zoomMoveEndPending = true;
  }

  function handleMapZoomEnd() {
    // Zooming changes only the map scale. Keep the selected card and rail order intact.
    syncMapShopLabels();
  }

  function handleMapDragStart() {
    window.clearTimeout(state.mapMoveTimer);
    state.mapGestureSource = 'user-pan';
    state.mapGestureStartCenter = map?.getCenter?.() || null;
    state.mapGestureStartZoom = map?.getZoom?.() ?? null;
    if (isMapUiA()) map.closePopup();
  }

  function handleMapMoveEnd() {
    syncMapShopLabels();

    if (state.zoomMoveEndPending) {
      state.zoomMoveEndPending = false;
      state.mapGestureSource = '';
      state.mapGestureStartCenter = null;
      state.mapGestureStartZoom = null;
      if (state.programmaticMapMove) {
        window.clearTimeout(state.programmaticClearTimer);
        state.programmaticMapMove = '';
      }
      return;
    }

    if (state.programmaticMapMove) {
      window.clearTimeout(state.programmaticClearTimer);
      state.programmaticMapMove = '';
      state.mapGestureSource = '';
      state.mapGestureStartCenter = null;
      state.mapGestureStartZoom = null;
      return;
    }

    const isUserPan = state.mapGestureSource === 'user-pan';
    const startCenter = state.mapGestureStartCenter;
    const startZoom = state.mapGestureStartZoom;
    state.mapGestureSource = '';
    state.mapGestureStartCenter = null;
    state.mapGestureStartZoom = null;

    if (!isMapUiA() || document.body.classList.contains('map-a-search-open') || !isUserPan) return;

    const movedPixels = startCenter && Number.isFinite(startZoom)
      ? map.project(startCenter, startZoom).distanceTo(map.project(map.getCenter(), startZoom))
      : Number.POSITIVE_INFINITY;
    if (movedPixels < 8) return;

    window.clearTimeout(state.mapMoveTimer);
    state.mapMoveTimer = window.setTimeout(() => {
      releaseForcedShopMarker();
      renderRail({ selectFirst: true, resetScroll: true });
    }, 210);
  }

  function ensureForcedMarker() {
    if (!isMapUiA() || !map || typeof L === 'undefined' || !state.forceShopId || markers?.[state.forceShopId]) return;
    const shop = findShop(state.forceShopId);
    if (!shop || !Number.isFinite(Number(shop.lat)) || !Number.isFinite(Number(shop.lng))) return;
    const categoryColor = typeof getMapCategoryColor === 'function' ? getMapCategoryColor(shop.category) : '#64748b';
    const marker = L.circleMarker([Number(shop.lat), Number(shop.lng)], {
      radius: String(selectedMapShopId) === String(shop.id) ? 11 : 9,
      color: '#ffffff',
      weight: String(selectedMapShopId) === String(shop.id) ? 4 : 2,
      opacity: 1,
      fillColor: categoryColor,
      fillOpacity: 1
    }).addTo(map);
    marker.__mapDiscoveryForced = true;
    markers[shop.id] = marker;
    markerHalos[shop.id] = [];
  }

  function releaseForcedShopMarker() {
    const forcedId = state.forceShopId;
    state.forceShopId = null;
    const forcedMarker = forcedId ? markers?.[forcedId] : null;
    if (!forcedMarker?.__mapDiscoveryForced) return;
    try { forcedMarker.remove(); } catch (_) {}
    delete markers[forcedId];
    delete markerHalos[forcedId];
    const label = mapShopLabels[forcedId];
    if (label) {
      try { label.remove(); } catch (_) {}
      delete mapShopLabels[forcedId];
    }
  }

  function decorateCurrentMarkers() {
    if (!map || typeof markers !== 'object') return;
    Object.entries(markers).forEach(([shopId, marker]) => {
      if (!marker || marker.__mapDiscoveryBound) return;
      marker.__mapDiscoveryBound = true;
      marker.on('click', () => {
        if (!isMapUiA()) return;
        state.forceShopId = shopId;
        selectMapShop(shopId);
        renderRail({ preserveActive: true, scrollToShopId: shopId });
      });
      if (isMapUiA() && marker.getPopup()) marker.unbindPopup();
    });
  }

  function ensureMapShopLabelPane() {
    if (!map) return;
    [
      ['mapShopLabelPane', '450'],
      ['mapSelectedShopMarkerPane', '670'],
      ['mapSelectedShopLabelPane', '680']
    ].forEach(([name, zIndex]) => {
      if (!map.getPane(name)) map.createPane(name);
      const pane = map.getPane(name);
      pane.style.zIndex = zIndex;
      pane.style.pointerEvents = 'none';
    });
  }

  function clearMapShopLabels() {
    Object.values(mapShopLabels).forEach(label => {
      try { label.remove(); } catch (_) {}
    });
    mapShopLabels = {};
  }

  function rebuildMapShopLabels() {
    if (!map || typeof L === 'undefined') return;
    ensureMapShopLabelPane();
    const markerIds = new Set(Object.keys(markers || {}));
    shops.forEach(shop => {
      if (!markerIds.has(String(shop.id))) return;
      const labelText = getShopMapLabel(shop);
      if (!labelText) return;
      const content = document.createElement('span');
      content.textContent = labelText;
      mapShopLabels[shop.id] = L.tooltip({
        permanent: true,
        interactive: false,
        direction: 'bottom',
        offset: [0, MAP_LABEL_OFFSET_Y],
        opacity: 1,
        pane: 'mapShopLabelPane',
        className: 'map-shop-label'
      }).setLatLng([Number(shop.lat), Number(shop.lng)]).setContent(content);
      mapShopLabels[shop.id].__mapDiscoveryOffsetY = MAP_LABEL_OFFSET_Y;
    });
  }

  function syncMapShopLabels() {
    if (!map) return;
    const canShow = map.getZoom() >= MAP_LABEL_MIN_ZOOM;
    const bounds = canShow ? map.getBounds().pad(0.1) : null;
    Object.entries(mapShopLabels).forEach(([shopId, label]) => {
      const isSelected = String(shopId) === String(state.activeShopId);
      const pane = isSelected ? 'mapSelectedShopLabelPane' : 'mapShopLabelPane';
      const offsetY = isSelected
        ? MAP_SELECTED_LABEL_OFFSET_Y
        : MAP_LABEL_OFFSET_Y;
      let shown = map.hasLayer(label);
      if (label.__mapDiscoveryOffsetY !== offsetY || label.options.pane !== pane) {
        label.__mapDiscoveryOffsetY = offsetY;
        label.options.offset = [0, offsetY];
        label.options.pane = pane;
        if (shown) {
          label.remove();
          shown = false;
        }
      }
      const shouldShow = canShow && !!markers?.[shopId] && bounds.contains(label.getLatLng());
      if (shouldShow && !shown) label.addTo(map);
      if (!shouldShow && shown) label.remove();
      label.getElement?.()?.classList.toggle('is-selected', isSelected);
    });
  }

  function mapLabelGraphemes(value) {
    const text = String(value ?? '').normalize('NFC').trim();
    if (!text) return [];
    if (labelSegmenter) return Array.from(labelSegmenter.segment(text), part => part.segment);
    return Array.from(text);
  }

  function getShopMapLabel(shop) {
    const raw = [shop?.mapLabel, shop?.shortName, shop?.['店舗名省略'], shop?.['店舗名の省略']]
      .find(value => String(value ?? '').trim()) ?? shop?.name ?? '';
    const labelWithoutBoilerplate = String(raw)
      .replace(/【[^】]*】/gu, '')
      .replace(/家系総本店/gu, '')
      .replace(/[\s　]+/gu, '')
      .trim();
    const graphemes = mapLabelGraphemes(labelWithoutBoilerplate);
    if (graphemes.length > MAP_LABEL_MAX_GRAPHEMES && !state.warnedLongLabels.has(shop.id)) {
      state.warnedLongLabels.add(shop.id);
      console.warn(`地図上の店舗名は最大4文字です（表示時に省略）: ${shop.name}`);
    }
    return graphemes.slice(0, MAP_LABEL_MAX_GRAPHEMES).join('');
  }

  function scheduleRailRefresh(options = {}) {
    if (state.refreshFrame) cancelAnimationFrame(state.refreshFrame);
    state.refreshFrame = requestAnimationFrame(() => {
      state.refreshFrame = 0;
      if (isMapUiA()) renderRail(options);
      if (document.getElementById('map-a-search-surface')?.classList.contains('is-open')) renderSearchResults();
      syncAllControls();
    });
  }

  function getFilteredShops(overrides = {}) {
    const filter = {
      openOnly: overrides.openOnly ?? !!showOpenOnly,
      want: overrides.want ?? !!advancedFilterSettings?.wantToGo,
      favorite: overrides.favorite ?? !!advancedFilterSettings?.favorite
    };
    let result = (Array.isArray(shops) ? shops : []).filter(shop =>
      Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng)) && shop.name !== 'ダミー'
    );
    const settings = advancedFilterSettings || { categories: [], day: '', time: '' };
    if (settings.categories?.length) result = result.filter(shop => settings.categories.includes(shop.category));
    if (filter.want) result = result.filter(shop => visits?.[shop.id]?.wantToGo);
    if (filter.favorite) result = result.filter(shop => visits?.[shop.id]?.favorite);
    if (settings.day !== '' && settings.time !== '') {
      result = result.filter(shop => isOpenAtDayTime(shop.openingHours, settings.day, settings.time));
    }
    if (filter.openOnly) result = result.filter(shop => isOpenNow(shop.openingHours));
    return result;
  }

  function getMapFocusLatLng() {
    if (!map?.getSize || !map?.containerPointToLatLng) {
      return map?.getCenter?.() || { lat: 35.45, lng: 139.62 };
    }
    const size = map.getSize();
    return map.containerPointToLatLng([size.x / 2, size.y * MAP_FOCUS_Y_RATIO]);
  }

  function sortRailShops(list, sortMode = state.sort) {
    const center = getMapFocusLatLng();
    const distanceFrom = sortMode === 'current' && userLocation ? userLocation : center;
    const withDistance = list.map(shop => ({
      shop,
      distance: calculateDistance(distanceFrom.lat, distanceFrom.lng, Number(shop.lat), Number(shop.lng))
    }));
    withDistance.sort((a, b) => {
      if (sortMode === 'name') {
        const aName = a.shop.nameHiragana || a.shop.name || '';
        const bName = b.shop.nameHiragana || b.shop.name || '';
        return String(aName).localeCompare(String(bName), 'ja');
      }
      if (sortMode === 'open') {
        const rank = status => status === 'open' ? 0 : status === 'soon' ? 1 : 2;
        const statusDiff = rank(getOpenStatus(a.shop.openingHours).state) - rank(getOpenStatus(b.shop.openingHours).state);
        if (statusDiff) return statusDiff;
      }
      return a.distance - b.distance;
    });
    return withDistance;
  }

  function renderRail(options = {}) {
    const rail = document.getElementById('map-a-card-rail');
    if (!rail || !map) return;
    if (state.sort === 'current' && !userLocation) state.sort = 'center';
    const allSorted = sortRailShops(getFilteredShops());
    state.totalShopCount = allSorted.length;
    let sorted = allSorted.slice(0, MAX_RAIL_SHOPS);

    if (state.forceShopId && !sorted.some(item => String(item.shop.id) === String(state.forceShopId))) {
      const forced = findShop(state.forceShopId);
      if (forced && Number.isFinite(Number(forced.lat)) && Number.isFinite(Number(forced.lng))) {
        const center = getMapFocusLatLng();
        sorted.unshift({
          shop: forced,
          distance: calculateDistance(center.lat, center.lng, Number(forced.lat), Number(forced.lng))
        });
      }
    }

    state.visibleShops = sorted;
    if (options.selectFirst || !sorted.some(item => String(item.shop.id) === String(state.activeShopId))) {
      state.activeShopId = sorted[0]?.shop.id || null;
    }
    if (options.scrollToShopId) state.activeShopId = options.scrollToShopId;

    rail.innerHTML = sorted.length
      ? sorted.map((item, index) => renderRailCard(item, index)).join('')
      : '<div class="map-a-empty-card">条件に合うお店がありません</div>';

    updateRailHeader();
    syncMapSelection();
    void hydrateRailCardPhotos(sorted.map(item => item.shop.id));

    requestAnimationFrame(() => {
      if (options.resetScroll || options.selectFirst) {
        rail.scrollTo({ left: 0, behavior: 'auto' });
      } else if (options.scrollToShopId) {
        scrollRailToShop(options.scrollToShopId, true, false);
      }
    });
  }

  function renderRailCard(item, index) {
    const shop = item.shop;
    const status = getOpenStatus(shop.openingHours);
    const hasScheduledTime = advancedFilterSettings.day !== '' && advancedFilterSettings.time !== '';
    const statusState = hasScheduledTime ? 'open' : status.state;
    const statusLabel = hasScheduledTime
      ? '営業予定'
      : status.state === 'open' ? '営業中' : status.state === 'soon' ? '閉店間近' : '時間外';
    const origin = getOriginShop(shop);
    const xURL = typeof getShopXURL === 'function' ? getShopXURL(shop) : String(shop.xURL || '');
    const googleURL = String(shop.googleMapUrl || '');
    const active = String(shop.id) === String(state.activeShopId);
    const color = typeof getMapCategoryColor === 'function' ? getMapCategoryColor(shop.category) : '#64748b';
    const photoURLs = getCachedRailCardPhotos(shop.id);
    const todayHours = typeof getTodayHours === 'function' ? getTodayHours(shop.openingHours) : '';
    const cardHours = hasScheduledTime
      ? getScheduledDayHours(shop.openingHours, advancedFilterSettings.day)
      : todayHours && todayHours !== '営業時間情報なし' ? `本日 ${todayHours}` : '';
    const originLabel = origin
      ? (getShopMapLabel(origin) || String(origin.name || '').replace(/[\s　]+(?:本店|総本店)$/u, ''))
      : '';
    return `
      <article class="map-a-card${active ? ' is-active' : ''}" style="--map-a-card-color:${escapeAttribute(color)}" data-shop-id="${escapeAttribute(shop.id)}" data-rail-index="${index}" aria-label="${escapeAttribute(shop.name)}" aria-current="${active ? 'true' : 'false'}">
        <button class="map-a-card-title-row" type="button" data-card-action="focus" aria-label="${escapeAttribute(shop.name)}を選択">
          <span class="map-a-card-name">${escapeText(shop.name)}</span>
          <span class="map-a-card-distance">${formatDistance(item.distance)}</span>
        </button>
        <div class="map-a-card-meta">
          <span class="map-a-chip is-category">${escapeText(getShortCategoryName(shop.category))}</span>
          ${origin ? `<button class="map-a-chip is-origin" type="button" data-card-action="origin" data-origin-id="${escapeAttribute(origin.id)}" aria-label="出身店 ${escapeAttribute(originLabel)}を家系図で表示">${escapeText(originLabel)}</button>` : ''}
          <span class="map-a-card-area-inline">${icons.pin}<span>${escapeText(shop.area || 'エリア情報なし')}</span></span>
          <span class="map-a-chip is-status is-${statusState}">${statusLabel}</span>
        </div>
        ${cardHours ? `<span class="map-a-card-hours" title="${escapeAttribute(cardHours)}">${escapeText(cardHours)}</span>` : ''}
        <div class="map-a-card-bottom">
          <button class="map-a-card-photo-slot${photoURLs.length ? ' has-photo' : ''}${photoURLs.length > 1 ? ' has-multiple' : ''}" type="button" data-card-action="detail" data-card-photo-slot aria-label="${escapeAttribute(shop.name)}の投稿写真${photoURLs.length ? `${photoURLs.length}枚` : ''}を詳細で見る" aria-hidden="${photoURLs.length ? 'false' : 'true'}" tabindex="${photoURLs.length ? '0' : '-1'}">${renderRailCardPhotoPreview(photoURLs)}</button>
          <span class="map-a-card-bottom-spacer"></span>
          ${xURL ? `<a class="map-a-card-action" href="${escapeAttribute(xURL)}" target="_blank" rel="noopener noreferrer" data-card-action="x" aria-label="公式Xを開く">${icons.xmark}</a>` : ''}
          <button class="map-a-card-action is-detail" type="button" data-card-action="detail">詳細</button>
          ${googleURL ? `<a class="map-a-card-action" href="${escapeAttribute(googleURL)}" target="_blank" rel="noopener noreferrer" data-card-action="map" aria-label="Googleマップで開く">${icons.map}</a>` : ''}
        </div>
      </article>`;
  }

  function getScheduledDayHours(openingHours, selectedDay) {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayIndex = Number(selectedDay);
    if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) return '';
    const dayLabel = `${dayNames[dayIndex]}曜`;
    if (!openingHours) return `${dayLabel} 営業時間情報なし`;
    const times = openingHours[dayKeys[dayIndex]]?.times;
    if (!Array.isArray(times) || times.length === 0) return `${dayLabel} 定休日`;
    if (times.length === 1 && times[0]?.start === '00:00' && times[0]?.end === '24:00') {
      return `${dayLabel} 24時間営業`;
    }
    const ranges = times
      .filter(time => time?.start && time?.end)
      .map(time => `${time.start}–${time.end}`);
    return ranges.length ? `${dayLabel} ${ranges.join('、')}` : `${dayLabel} 営業時間情報なし`;
  }

  function normalizeRailCardPhoto(value) {
    const photo = String(value || '').trim();
    return /^(?:https?:\/\/|data:image\/)/i.test(photo) ? photo : '';
  }

  function normalizeRailCardPhotos(values) {
    const photos = [];
    const seen = new Set();
    (Array.isArray(values) ? values.flat(Infinity) : [values]).forEach(value => {
      const photo = normalizeRailCardPhoto(value);
      if (!photo || seen.has(photo)) return;
      seen.add(photo);
      photos.push(photo);
    });
    return photos;
  }

  function mergeRailCardPhotos(...groups) {
    return normalizeRailCardPhotos(groups);
  }

  function renderRailCardPhotoPreview(values) {
    const photos = normalizeRailCardPhotos(values);
    return photos.slice(0, 2).map((photo, index) => `
      <span class="map-a-card-photo-preview">
        <img src="${escapeAttribute(photo)}" loading="lazy" alt="" data-card-photo-url="${escapeAttribute(photo)}">
        ${index === 1 && photos.length > 2 ? `<span class="map-a-card-photo-more">+${photos.length - 2}</span>` : ''}
      </span>`).join('');
  }

  function getLatestLocalPhotoReferences(shopId) {
    const logs = visits?.[shopId]?.logs;
    if (!Array.isArray(logs)) return [];
    const references = [];
    for (let index = logs.length - 1; index >= 0; index -= 1) {
      const photos = Array.isArray(logs[index]?.photos) ? logs[index].photos : [];
      photos.forEach(photo => {
        if (photo && !references.includes(photo)) references.push(photo);
      });
    }
    return references;
  }

  function getCachedCommunityPhotos(shopId) {
    if (typeof communityVisitCache === 'undefined' || !communityVisitCache) return [];
    const key = String(shopId);
    const photos = [];
    for (const visit of Object.values(communityVisitCache)) {
      if (String(visit?.shop_id || '') !== key) continue;
      photos.push(...(Array.isArray(visit?.photo_urls) ? visit.photo_urls : []));
      if (visit?.photo_url) photos.push(visit.photo_url);
    }
    return normalizeRailCardPhotos(photos);
  }

  function getCachedRailCardPhotos(shopId) {
    const key = String(shopId);
    if (state.cardPhotos.has(key)) return normalizeRailCardPhotos(state.cardPhotos.get(key));
    const localPhotos = normalizeRailCardPhotos(getLatestLocalPhotoReferences(key));
    const photos = mergeRailCardPhotos(localPhotos, getCachedCommunityPhotos(key));
    if (photos.length) state.cardPhotos.set(key, photos);
    return photos;
  }

  function applyRailCardPhotos(shopId, values) {
    const key = String(shopId);
    const photos = normalizeRailCardPhotos(values);
    state.cardPhotos.set(key, photos);
    const rail = document.getElementById('map-a-card-rail');
    const card = rail && Array.from(rail.querySelectorAll('.map-a-card')).find(item => String(item.dataset.shopId) === key);
    const slot = card?.querySelector('[data-card-photo-slot]');
    if (!slot) return;
    slot.innerHTML = renderRailCardPhotoPreview(photos);
    slot.classList.toggle('has-photo', photos.length > 0);
    slot.classList.toggle('has-multiple', photos.length > 1);
    slot.setAttribute('aria-hidden', photos.length ? 'false' : 'true');
    slot.setAttribute('aria-label', `${findShop(key)?.name || '店舗'}の投稿写真${photos.length ? `${photos.length}枚` : ''}を詳細で見る`);
    slot.tabIndex = photos.length ? 0 : -1;
    slot.querySelectorAll('img[data-card-photo-url]').forEach(image => {
      image.addEventListener('error', () => {
        const failedURL = image.dataset.cardPhotoUrl || image.currentSrc || image.src;
        applyRailCardPhotos(key, getCachedRailCardPhotos(key).filter(photo => photo !== failedURL));
      }, { once: true });
    });
  }

  async function hydrateRailCardPhotos(shopIds) {
    const pending = [...new Set(shopIds.map(String))].filter(shopId =>
      !state.cardPhotoHydrated.has(shopId) && !state.cardPhotoLoading.has(shopId)
    );
    if (!pending.length) return;
    pending.forEach(shopId => state.cardPhotoLoading.add(shopId));

    try {
      const remoteShopIds = [];
      for (const shopId of pending) {
        let photos = mergeRailCardPhotos(getCachedRailCardPhotos(shopId), getCachedCommunityPhotos(shopId));
        const localReferences = getLatestLocalPhotoReferences(shopId);
        if (localReferences.length && typeof loadPhotoFromFile === 'function') {
          const loadedLocalPhotos = await Promise.all(localReferences.map(async reference => {
            try {
              return normalizeRailCardPhoto(await loadPhotoFromFile(reference));
            } catch (_) {
              return '';
            }
          }));
          photos = mergeRailCardPhotos(loadedLocalPhotos, photos);
        }
        if (photos.length) applyRailCardPhotos(shopId, photos);
        remoteShopIds.push(shopId);
      }

      if (remoteShopIds.length && typeof supabaseClient !== 'undefined' && supabaseClient && typeof fetchPhotoListMapForVisits === 'function') {
        const { data: visitRows, error } = await supabaseClient
          .from('visits')
          .select('id, shop_id, user_id, visited_on, created_at')
          .in('shop_id', remoteShopIds)
          .eq('is_public', true)
          .lte('visited_on', typeof getJstTodayStr === 'function' ? getJstTodayStr() : new Date().toISOString().slice(0, 10))
          .order('visited_on', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(Math.max(120, remoteShopIds.length * 8));
        if (error) throw error;
        const visibleVisits = (visitRows || []).filter(visit =>
          typeof blockedUserIds === 'undefined' || !blockedUserIds?.has?.(visit.user_id)
        );
        const photoMap = await fetchPhotoListMapForVisits(visibleVisits.map(visit => visit.id));
        const photosByShop = new Map();
        visibleVisits.forEach(visit => {
          const key = String(visit.shop_id);
          photosByShop.set(key, mergeRailCardPhotos(photosByShop.get(key), photoMap.get(visit.id)));
        });
        remoteShopIds.forEach(shopId => {
          const photos = mergeRailCardPhotos(getCachedRailCardPhotos(shopId), photosByShop.get(shopId));
          if (photos.length) applyRailCardPhotos(shopId, photos);
        });
      }

      pending.forEach(shopId => {
        if (!state.cardPhotos.has(shopId)) state.cardPhotos.set(shopId, []);
      });
    } catch (error) {
      console.warn('カード写真を取得できませんでした:', error);
    } finally {
      pending.forEach(shopId => {
        state.cardPhotoLoading.delete(shopId);
        state.cardPhotoHydrated.add(shopId);
      });
    }
  }

  async function hydrateDetailShopPhotos(shopId) {
    const key = String(shopId);
    if (state.detailPhotoHydrated.has(key)) return getCachedRailCardPhotos(key);
    if (state.detailPhotoLoading.has(key)) return state.detailPhotoLoading.get(key);

    const request = (async () => {
      let localPhotos = normalizeRailCardPhotos(getLatestLocalPhotoReferences(key));
      let photos = mergeRailCardPhotos(localPhotos, getCachedRailCardPhotos(key), getCachedCommunityPhotos(key));
      const localReferences = getLatestLocalPhotoReferences(key);
      if (localReferences.length && typeof loadPhotoFromFile === 'function') {
        const loadedLocalPhotos = await Promise.all(localReferences.map(async reference => {
          try {
            return normalizeRailCardPhoto(await loadPhotoFromFile(reference));
          } catch (_) {
            return '';
          }
        }));
        localPhotos = mergeRailCardPhotos(loadedLocalPhotos, localPhotos);
        photos = mergeRailCardPhotos(localPhotos, photos);
      }

      if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof fetchPhotoListMapForVisits === 'function') {
        const { data: visitRows, error } = await supabaseClient
          .from('visits')
          .select('id, shop_id, user_id, visited_on, created_at')
          .eq('shop_id', key)
          .eq('is_public', true)
          .lte('visited_on', typeof getJstTodayStr === 'function' ? getJstTodayStr() : new Date().toISOString().slice(0, 10))
          .order('visited_on', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const visibleVisits = (visitRows || []).filter(visit =>
          typeof blockedUserIds === 'undefined' || !blockedUserIds?.has?.(visit.user_id)
        );
        const photoMap = await fetchPhotoListMapForVisits(visibleVisits.map(visit => visit.id));
        let remotePhotos = [];
        visibleVisits.forEach(visit => {
          remotePhotos = mergeRailCardPhotos(remotePhotos, photoMap.get(visit.id));
        });
        photos = mergeRailCardPhotos(localPhotos, remotePhotos, photos);
      }

      applyRailCardPhotos(key, photos);
      state.detailPhotoHydrated.add(key);
      return photos;
    })().catch(error => {
      console.warn('詳細写真を取得できませんでした:', error);
      return getCachedRailCardPhotos(key);
    }).finally(() => {
      state.detailPhotoLoading.delete(key);
    });

    state.detailPhotoLoading.set(key, request);
    return request;
  }

  function updateDetailPhotoGallery(shopId, values) {
    const key = String(shopId);
    const section = document.getElementById('detail-photo-section');
    const gallery = document.getElementById('detail-photo-gallery');
    const count = document.getElementById('detail-photo-count');
    if (!section || !gallery || !count || section.dataset.shopId !== key) return;
    const photos = normalizeRailCardPhotos(values);
    section.hidden = photos.length === 0;
    count.textContent = photos.length ? `${photos.length}枚` : '';
    gallery.innerHTML = photos.map((photo, index) => `
      <figure class="map-a-detail-photo">
        <img src="${escapeAttribute(photo)}" loading="lazy" alt="${escapeAttribute(findShop(key)?.name || '店舗')}の投稿写真 ${index + 1}枚目">
      </figure>`).join('');
    gallery.querySelectorAll('img').forEach(image => {
      image.addEventListener('error', () => image.closest('.map-a-detail-photo')?.remove(), { once: true });
    });
  }

  async function renderMapDiscoveryDetailPhotos(shopId) {
    const key = String(shopId);
    const section = document.getElementById('detail-photo-section');
    if (!section) return;
    section.dataset.shopId = key;
    updateDetailPhotoGallery(key, getCachedRailCardPhotos(key));
    const photos = await hydrateDetailShopPhotos(key);
    updateDetailPhotoGallery(key, photos);
  }

  window.renderMapDiscoveryDetailPhotos = renderMapDiscoveryDetailPhotos;

  function getOriginShop(shop) {
    if (!shop?.parent) return null;
    const origin = findShop(shop.parent);
    return origin && origin.name !== 'ダミー' ? origin : null;
  }

  function updateRailHeader() {
    const heading = document.getElementById('map-a-rail-heading');
    const position = document.getElementById('map-a-rail-position');
    const labels = {
      center: '地図中心から近い順',
      current: '現在地・指定地点から近い順',
      open: '営業中を優先',
      name: '店名 あ→ん'
    };
    if (heading) heading.textContent = state.sort === 'center' ? '中心から近いお店' : labels[state.sort];
    const index = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
    const total = Math.max(state.totalShopCount, state.visibleShops.length);
    if (position) position.textContent = state.visibleShops.length ? `${index + 1} / ${total}` : '0 / 0';
  }

  function beginRailGesture(event) {
    const rail = event.currentTarget;
    state.railGestureStartIndex = getNearestRailIndex(rail);
    state.railGestureStartX = event.clientX;
  }

  function finishRailGesture(event) {
    const rail = event.currentTarget;
    if (state.railGestureStartIndex === null) return;
    const startIndex = state.railGestureStartIndex;
    const deltaX = event.clientX - state.railGestureStartX;
    state.railGestureStartIndex = null;
    if (Math.abs(deltaX) <= 6) return;
    if (Math.abs(deltaX) > 6) state.suppressCardClickUntil = Date.now() + 450;
    const nearest = getNearestRailIndex(rail);
    let target = Math.max(startIndex - 1, Math.min(startIndex + 1, nearest));
    if (Math.abs(deltaX) > 24) target = Math.max(0, Math.min(state.visibleShops.length - 1, startIndex + (deltaX < 0 ? 1 : -1)));
    settleRailAt(target, true, true);
  }

  function cancelRailGesture(event) {
    const startIndex = state.railGestureStartIndex;
    state.railGestureStartIndex = null;
    if (startIndex === null) return;
    state.suppressCardClickUntil = Date.now() + 450;
  }

  function handleRailScroll(event) {
    const rail = event.currentTarget;
    window.clearTimeout(state.railSettleTimer);
    if (Date.now() < state.suppressRailUntil) return;
    state.railSettleTimer = window.setTimeout(() => {
      // Some Android webviews cancel or retarget pointerup during native scrolling.
      // Use the settled scroll position as the source of truth in that case.
      if (state.railGestureStartIndex !== null) {
        state.railGestureStartIndex = null;
        state.suppressCardClickUntil = Date.now() + 300;
      }
      const activeIndex = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
      const nearest = getNearestRailIndex(rail);
      const target = Math.max(activeIndex - 1, Math.min(activeIndex + 1, nearest));
      settleRailAt(target, true, true);
    }, 180);
  }

  function handleRailScrollEnd(event) {
    const rail = event.currentTarget;
    const activeIndex = Math.max(0, state.visibleShops.findIndex(item => String(item.shop.id) === String(state.activeShopId)));
    const nearest = getNearestRailIndex(rail);
    if (nearest === activeIndex) return;
    state.railGestureStartIndex = null;
    state.suppressCardClickUntil = Date.now() + 300;
    const target = Math.max(activeIndex - 1, Math.min(activeIndex + 1, nearest));
    settleRailAt(target, false, true);
  }

  function getNearestRailIndex(rail) {
    const cards = Array.from(rail.querySelectorAll('.map-a-card'));
    if (!cards.length) return 0;
    const targetLeft = rail.scrollLeft + 14;
    let bestIndex = 0;
    let bestDistance = Infinity;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - targetLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function settleRailAt(index, smooth, fromUser) {
    const rail = document.getElementById('map-a-card-rail');
    const cards = rail ? Array.from(rail.querySelectorAll('.map-a-card')) : [];
    const card = cards[index];
    const item = state.visibleShops[index];
    if (!rail || !card || !item) return;
    state.suppressRailUntil = Date.now() + 430;
    rail.scrollTo({ left: Math.max(0, card.offsetLeft - 14), behavior: smooth ? 'smooth' : 'auto' });
    window.clearTimeout(state.railSettleTimer);
    state.railSettleTimer = window.setTimeout(() => {
      selectMapShop(item.shop.id);
      updateRailCardSelection();
      if (fromUser) maybeZoomOutForCard(item.shop);
    }, smooth ? 240 : 0);
  }

  function handleRailClick(event) {
    const action = event.target.closest('[data-card-action]');
    const card = event.target.closest('.map-a-card');
    if (!card) return;
    const shopId = card.dataset.shopId;
    if (action) {
      if (Date.now() < state.suppressCardClickUntil) {
        event.preventDefault();
        return;
      }
      event.stopPropagation();
      const type = action.dataset.cardAction;
      if (type === 'focus') {
        event.preventDefault();
        activateShopFromCard(shopId);
      } else if (type === 'origin') {
        event.preventDefault();
        if (typeof jumpToLineageTabAndSelect === 'function') jumpToLineageTabAndSelect(action.dataset.originId);
      } else if (type === 'detail') {
        if (typeof showShopDetail === 'function') showShopDetail(shopId);
      }
      return;
    }
    if (Date.now() < state.suppressCardClickUntil) return;
    activateShopFromCard(shopId);
  }

  function activateShopFromCard(shopId) {
    const shop = findShop(shopId);
    if (!shop) return;
    selectMapShop(shop.id);
    updateRailCardSelection();
  }

  function selectMapShop(shopId) {
    state.activeShopId = shopId;
    if (typeof selectMapMarker === 'function' && markers?.[shopId]) selectMapMarker(shopId);
    syncSelectedShopIndicator(shopId);
    updateRailHeader();
  }

  function syncMapSelection() {
    if (state.activeShopId && markers?.[state.activeShopId] && typeof selectMapMarker === 'function') {
      selectMapMarker(state.activeShopId);
    }
    syncSelectedShopIndicator(state.activeShopId);
  }

  function syncSelectedShopIndicator(shopId) {
    if (!isMapUiA() || !map || typeof L === 'undefined') {
      if (selectedShopIndicator) {
        selectedShopIndicator.remove();
        selectedShopIndicator = null;
      }
      return;
    }
    const shop = findShop(shopId);
    if (!shop || !Number.isFinite(Number(shop.lat)) || !Number.isFinite(Number(shop.lng))) return;
    ensureMapShopLabelPane();
    const position = [Number(shop.lat), Number(shop.lng)];
    const categoryColor = typeof getMapCategoryColor === 'function' ? getMapCategoryColor(shop.category) : '#64748b';
    if (!selectedShopIndicator) {
      selectedShopIndicator = L.circleMarker(position, {
        radius: 13,
        color: '#25211f',
        weight: 4,
        opacity: 1,
        fillColor: categoryColor,
        fillOpacity: 1,
        interactive: false,
        bubblingMouseEvents: false,
        pane: 'mapSelectedShopMarkerPane',
        className: 'map-a-selected-pin-indicator'
      }).addTo(map);
      syncMapShopLabels();
      return;
    }
    selectedShopIndicator.setLatLng(position);
    selectedShopIndicator.setStyle({ fillColor: categoryColor });
    selectedShopIndicator.bringToFront();
    syncMapShopLabels();
  }

  function updateRailCardSelection() {
    document.querySelectorAll('#map-a-card-rail .map-a-card').forEach(card => {
      const active = String(card.dataset.shopId) === String(state.activeShopId);
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-current', String(active));
    });
    updateRailHeader();
  }

  function scrollRailToShop(shopId, smooth = true, applyMapBehavior = false) {
    const index = state.visibleShops.findIndex(item => String(item.shop.id) === String(shopId));
    if (index < 0) return;
    settleRailAt(index, smooth, applyMapBehavior);
  }

  function maybeZoomOutForCard(shop) {
    if (!map || state.cardMapBehavior !== 'zoomout' || isShopInSafeArea(shop)) return;
    const currentZoom = map.getZoom();
    let targetZoom = currentZoom;
    for (let step = 1; step <= CARD_ZOOM_OUT_MAX_STEPS; step += 1) {
      const candidateZoom = currentZoom - step;
      if (candidateZoom < CARD_ZOOM_OUT_MIN_ZOOM) break;
      targetZoom = candidateZoom;
      if (isShopInSafeArea(shop, candidateZoom)) {
        break;
      }
    }
    if (targetZoom >= currentZoom) return;
    markProgrammaticMapMove('rail-zoomout');
    map.setZoom(targetZoom, { animate: true });
  }

  function getSafeAreaPadding() {
    const mapSize = map?.getSize?.() || { x: 390, y: 600 };
    const root = document.getElementById('map-a-root');
    const cardRegion = root?.querySelector('.map-a-card-region');
    const dock = root?.querySelector('.map-a-command-dock');
    const covered = Math.max(190, (cardRegion?.offsetHeight || 148) + (dock?.offsetHeight || 52) + 22);
    return {
      topLeft: L.point(26, 26),
      bottomRight: L.point(26, Math.min(mapSize.y - 40, covered))
    };
  }

  function isShopInSafeArea(shop, zoom = map?.getZoom?.()) {
    if (!map || !shop || !Number.isFinite(Number(shop.lat)) || !Number.isFinite(Number(shop.lng))) return false;
    const size = map.getSize();
    const centerPixel = map.project(map.getCenter(), zoom);
    const shopPixel = map.project([Number(shop.lat), Number(shop.lng)], zoom);
    const point = shopPixel.subtract(centerPixel).add(size.divideBy(2));
    const padding = getSafeAreaPadding();
    return point.x >= padding.topLeft.x && point.x <= size.x - padding.bottomRight.x &&
      point.y >= padding.topLeft.y && point.y <= size.y - padding.bottomRight.y;
  }

  function panShopIntoSafeArea(shop, animate) {
    if (!map || !shop) return;
    const padding = getSafeAreaPadding();
    map.panInside([Number(shop.lat), Number(shop.lng)], {
      paddingTopLeft: padding.topLeft,
      paddingBottomRight: padding.bottomRight,
      animate
    });
  }

  function markProgrammaticMapMove(source) {
    state.programmaticMapMove = source;
    window.clearTimeout(state.programmaticClearTimer);
    // Leaflet does not emit moveend when the requested camera is already equal.
    state.programmaticClearTimer = window.setTimeout(() => {
      state.programmaticMapMove = '';
    }, 800);
  }

  function openAdjustPanel() {
    closeSearchSurface();
    syncAdjustControls();
    switchAdjustTab(state.adjustTab);
    document.getElementById('map-a-adjust-panel')?.classList.add('is-open');
    document.getElementById('map-a-adjust-panel')?.setAttribute('aria-hidden', 'false');
    document.getElementById('map-a-scrim')?.classList.add('is-open');
    document.getElementById('map-a-adjust-trigger')?.setAttribute('aria-expanded', 'true');
  }

  function closeAdjustPanel() {
    document.getElementById('map-a-adjust-panel')?.classList.remove('is-open');
    document.getElementById('map-a-adjust-panel')?.setAttribute('aria-hidden', 'true');
    document.getElementById('map-a-scrim')?.classList.remove('is-open');
    document.getElementById('map-a-adjust-trigger')?.setAttribute('aria-expanded', 'false');
  }

  function switchAdjustTab(tab) {
    const nextTab = ['filter', 'sort', 'settings'].includes(tab) ? tab : 'filter';
    state.adjustTab = nextTab;
    document.querySelectorAll('[data-map-a-adjust-tab]').forEach(button => {
      const active = button.dataset.mapAAdjustTab === nextTab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-map-a-adjust-pane]').forEach(pane => {
      const active = pane.dataset.mapAAdjustPane === nextTab;
      pane.classList.toggle('is-active', active);
      pane.hidden = !active;
    });
    const subtitles = {
      filter: '表示する店舗を選ぶ',
      sort: 'カードの並び順を選ぶ',
      settings: 'カードと地図の動きを選ぶ'
    };
    const subtitle = document.getElementById('map-a-adjust-subtitle');
    if (subtitle) subtitle.textContent = subtitles[nextTab];
  }

  function handleAdjustInputChange(event) {
    if (event.target?.id === 'map-a-filter-day' || event.target?.id === 'map-a-filter-time') {
      const day = document.getElementById('map-a-filter-day')?.value || '';
      const time = document.getElementById('map-a-filter-time')?.value || '';
      // 指定日時検索と「現在時刻で営業中」は排他的。
      // 曜日または時刻を入力した時点で現在時刻フィルターを解除し、
      // もう片方を選んだ時に指定日時検索がそのまま有効になるようにする。
      if (day !== '' || time !== '') setChecked('map-a-filter-open', false);
    }
    const preserveActive = event.target?.name === 'map-a-card-map';
    applyAdjustDraft({ closePanel: false, preserveActive });
  }

  function handleAdjustCategoryClick(event) {
    const button = event.currentTarget;
    if (!button) return;
    const selected = getEffectiveAdjustCategorySelection();
    const group = button.dataset.mapACategoryGroup;
    if (group) {
      const groupValues = getAdjustCategoryOptions(group).map(option => option.value);
      const groupIsSelected = groupValues.length > 0 && groupValues.every(value => selected.has(value));
      groupValues.forEach(value => {
        if (groupIsSelected) selected.delete(value);
        else selected.add(value);
      });
    } else {
      const value = button.dataset.mapACategory;
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
    }
    storeAdjustCategorySelection(selected);
    syncAdjustCategoryControls();
    applyAdjustDraft({ closePanel: false });
  }

  function handleLegendCategoryClick(event) {
    const button = event.target.closest('[data-map-a-legend-category]');
    if (!button) return;
    const value = button.dataset.mapALegendCategory;
    const selected = getEffectiveAdjustCategorySelection();
    if (selected.has(value)) {
      // An empty array means "all categories" in the legacy filter, so retain
      // the last category instead of unexpectedly restoring every category.
      if (selected.size <= 1) return;
      selected.delete(value);
    } else {
      selected.add(value);
    }
    storeAdjustCategorySelection(selected);
    // The legend lives outside the adjust panel. Refresh every panel control
    // from the committed state before applying the category change so a stale
    // checkbox cannot overwrite filters changed from the map controls.
    syncAdjustControls();
    applyAdjustDraft({ closePanel: false });
  }

  function syncAdjustControls() {
    const sortInput = document.querySelector(`input[name="map-a-sort"][value="${state.sort}"]`);
    if (sortInput) sortInput.checked = true;
    const behaviorInput = document.querySelector(`input[name="map-a-card-map"][value="${state.cardMapBehavior}"]`);
    if (behaviorInput) behaviorInput.checked = true;
    const currentRadio = document.querySelector('input[name="map-a-sort"][value="current"]');
    if (currentRadio) currentRadio.disabled = !userLocation;
    setChecked('map-a-filter-open', !!showOpenOnly);
    setChecked('map-a-filter-want', !!advancedFilterSettings?.wantToGo);
    setChecked('map-a-filter-favorite', !!advancedFilterSettings?.favorite);
    const dayControl = document.getElementById('map-a-filter-day');
    const timeControl = document.getElementById('map-a-filter-time');
    if (dayControl) dayControl.value = String(advancedFilterSettings?.day ?? '');
    if (timeControl) timeControl.value = String(advancedFilterSettings?.time ?? '');
    syncAdjustCategoryControls();
    updateDraftCount();
  }

  function syncAdjustCategoryControls() {
    const selected = getEffectiveAdjustCategorySelection();
    document.querySelectorAll('[data-map-a-category]').forEach(button => {
      const active = selected.has(button.dataset.mapACategory);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const groupStates = {};
    document.querySelectorAll('[data-map-a-category-group]').forEach(button => {
      const group = button.dataset.mapACategoryGroup;
      const values = getAdjustCategoryOptions(group).map(option => option.value);
      const active = values.length > 0 && values.every(value => selected.has(value));
      groupStates[group] = active;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const summary = document.getElementById('map-a-category-summary');
    if (summary) {
      if (groupStates.iekei && groupStates.isse) summary.textContent = '家系・壱系';
      else if (groupStates.iekei) summary.textContent = '家系';
      else if (groupStates.isse) summary.textContent = '壱系';
      else summary.textContent = `${selected.size}系統`;
    }
  }

  function resetAdjustDraft() {
    const activeTab = state.adjustTab;
    if (activeTab === 'filter') {
      setChecked('map-a-filter-open', true);
      setChecked('map-a-filter-want', false);
      setChecked('map-a-filter-favorite', false);
      showOpenOnly = true;
      advancedFilterSettings.categories = getAdjustCategoryOptions('iekei').map(option => option.value);
      advancedFilterSettings.wantToGo = false;
      advancedFilterSettings.favorite = false;
      advancedFilterSettings.day = '';
      advancedFilterSettings.time = '';
      if (document.getElementById('map-a-filter-day')) document.getElementById('map-a-filter-day').value = '';
      if (document.getElementById('map-a-filter-time')) document.getElementById('map-a-filter-time').value = '';
      if (document.getElementById('filter-day')) document.getElementById('filter-day').value = '';
      if (document.getElementById('filter-time')) document.getElementById('filter-time').value = '';
      syncAdjustCategoryControls();
      clearClassicSearchFilter();
    } else if (activeTab === 'sort') {
      setRadio('map-a-sort', 'center');
      state.sort = 'center';
    } else {
      setRadio('map-a-card-map', 'zoomout');
      state.cardMapBehavior = 'zoomout';
    }
    try {
      localStorage.setItem(SORT_KEY, state.sort);
      localStorage.setItem(CARD_MAP_BEHAVIOR_KEY, state.cardMapBehavior);
    } catch (_) {}
    if (activeTab === 'settings') {
      syncAllControls();
      updateDraftCount();
      return;
    }
    releaseForcedShopMarker();
    if (typeof updateFilterSummary === 'function') updateFilterSummary();
    if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    syncLegacyFilterControls();
    renderShopList();
    updateMarkers();
    renderRail({ selectFirst: true, resetScroll: true });
    syncAllControls();
    updateDraftCount();
  }

  function applyAdjustDraft(options = {}) {
    state.sort = getRadioValue('map-a-sort', 'center');
    state.cardMapBehavior = getRadioValue('map-a-card-map', 'zoomout');
    showOpenOnly = !!document.getElementById('map-a-filter-open')?.checked;
    advancedFilterSettings.day = document.getElementById('map-a-filter-day')?.value ?? advancedFilterSettings.day;
    advancedFilterSettings.time = document.getElementById('map-a-filter-time')?.value ?? advancedFilterSettings.time;
    if (showOpenOnly && (advancedFilterSettings.day !== '' || advancedFilterSettings.time !== '')) {
      advancedFilterSettings.day = '';
      advancedFilterSettings.time = '';
      if (document.getElementById('map-a-filter-day')) document.getElementById('map-a-filter-day').value = '';
      if (document.getElementById('map-a-filter-time')) document.getElementById('map-a-filter-time').value = '';
      if (document.getElementById('filter-day')) document.getElementById('filter-day').value = '';
      if (document.getElementById('filter-time')) document.getElementById('filter-time').value = '';
      if (typeof updateFilterSummary === 'function') updateFilterSummary();
      if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    }
    if (document.getElementById('filter-day')) document.getElementById('filter-day').value = advancedFilterSettings.day;
    if (document.getElementById('filter-time')) document.getElementById('filter-time').value = advancedFilterSettings.time;
    advancedFilterSettings.wantToGo = !!document.getElementById('map-a-filter-want')?.checked;
    advancedFilterSettings.favorite = !!document.getElementById('map-a-filter-favorite')?.checked;
    releaseForcedShopMarker();
    try {
      localStorage.setItem(SORT_KEY, state.sort);
      localStorage.setItem(CARD_MAP_BEHAVIOR_KEY, state.cardMapBehavior);
    } catch (_) {}
    if (typeof updateFilterSummary === 'function') updateFilterSummary();
    if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    syncLegacyFilterControls();
    if (options.closePanel !== false) closeAdjustPanel();
    renderShopList();
    updateMarkers();
    renderRail(options.preserveActive
      ? { preserveActive: true }
      : { selectFirst: true, resetScroll: true });
    syncAllControls();
    updateDraftCount();
  }

  function updateDraftCount() {
    const count = getFilteredShops({
      openOnly: !!document.getElementById('map-a-filter-open')?.checked,
      want: !!document.getElementById('map-a-filter-want')?.checked,
      favorite: !!document.getElementById('map-a-filter-favorite')?.checked
    }).length;
    const element = document.getElementById('map-a-draft-count');
    if (element) element.textContent = String(count);
  }

  function toggleOpenOnlyImmediately() {
    const hasScheduledTime = advancedFilterSettings.day !== '' || advancedFilterSettings.time !== '';
    if (hasScheduledTime) {
      advancedFilterSettings.day = '';
      advancedFilterSettings.time = '';
      if (document.getElementById('filter-day')) document.getElementById('filter-day').value = '';
      if (document.getElementById('filter-time')) document.getElementById('filter-time').value = '';
      showOpenOnly = true;
      if (typeof updateFilterSummary === 'function') updateFilterSummary();
      if (typeof updateOpenButtonText === 'function') updateOpenButtonText();
    } else {
      showOpenOnly = !showOpenOnly;
    }
    releaseForcedShopMarker();
    syncLegacyFilterControls();
    renderShopList();
    updateMarkers();
    renderRail({ selectFirst: true, resetScroll: true });
    syncAllControls();
  }

  function syncLegacyFilterControls() {
    ['btn-open-toggle', 'list-btn-open-toggle'].forEach(id => {
      document.getElementById(id)?.classList.toggle('active', !!showOpenOnly);
    });
  }

  function clearClassicSearchFilter() {
    searchQuery = '';
    ['search-input', 'list-search-input'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
    ['search-clear', 'list-search-clear'].forEach(id => document.getElementById(id)?.classList.remove('visible'));
    document.getElementById('btn-search-toggle')?.classList.remove('active');
    const searchBox = document.getElementById('map-search-box');
    if (searchBox) searchBox.style.display = 'none';
    document.querySelector('.map-view')?.classList.remove('drawer-search-open');
    window.syncMapDrawerForSearch?.();
  }

  function syncAllControls() {
    syncLegacyFilterControls();
    syncAdjustControls();
    syncOpenToggle();
    syncCurrentLocationButton();
    syncFilterLabel();
    syncMapColorLegend();
    syncMapUiSetting();
  }

  function syncMapColorLegend() {
    const legend = document.getElementById('map-a-color-legend');
    const items = document.getElementById('map-a-color-legend-items');
    if (!legend || !items) return;
    const selected = getEffectiveAdjustCategorySelection();
    const options = ['iekei', 'isse']
      .flatMap(group => getAdjustCategoryOptions(group));
    items.innerHTML = options.map(option => {
      const color = typeof getMapCategoryColor === 'function' ? getMapCategoryColor(option.value) : '#64748b';
      const shortLabel = typeof getShortCategoryName === 'function' ? getShortCategoryName(option.value) : option.label;
      const label = option.value === '王道家（との丸家）'
        ? 'との丸'
        : option.value === '壱系（資本系）'
          ? '壱系（資本）'
          : shortLabel;
      const active = selected.has(option.value);
      return `<button class="map-a-color-legend-item${active ? ' is-active' : ''}" type="button" data-map-a-legend-category="${escapeMarkup(option.value)}" aria-pressed="${active}" aria-label="${escapeMarkup(label)}を${active ? '非表示' : '表示'}" style="--map-a-legend-color:${escapeMarkup(color)}"><span class="map-a-color-legend-dot" aria-hidden="true"></span>${escapeMarkup(label)}</button>`;
    }).join('');
    legend.hidden = options.length === 0;
  }

  function handleCurrentLocationClick() {
    const legacyButton = document.getElementById('btn-nearby');
    if (!legacyButton || legacyButton.disabled) return;
    legacyButton.click();
    syncCurrentLocationButton();
    window.setTimeout(syncCurrentLocationButton, 250);
    window.setTimeout(syncCurrentLocationButton, 12000);
  }

  function syncCurrentLocationButton() {
    const button = document.getElementById('map-a-location-trigger');
    if (!button) return;
    const active = !!userLocation;
    const loading = !!isRequestingLocation;
    button.classList.toggle('is-active', active);
    button.classList.toggle('is-loading', loading);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', loading
      ? '現在地を取得中'
      : active ? '現在地の指定を解除' : '現在地を表示');
  }

  function syncOpenToggle() {
    const button = document.getElementById('map-a-open-toggle');
    if (!button) return;
    const hasScheduledTime = advancedFilterSettings.day !== '' && advancedFilterSettings.time !== '';
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    button.classList.toggle('is-active', !!showOpenOnly || hasScheduledTime);
    button.classList.toggle('is-scheduled', hasScheduledTime);
    button.setAttribute('aria-pressed', String(!!showOpenOnly || hasScheduledTime));
    button.setAttribute('aria-label', hasScheduledTime
      ? `${dayNames[Number(advancedFilterSettings.day)]}曜 ${advancedFilterSettings.time}に営業する店舗を表示中。現在時刻の営業中検索に戻す`
      : showOpenOnly
        ? '営業中の店舗だけ表示中。全店舗表示に戻す'
        : '全店舗を表示中。営業中のみに絞る');
    const label = document.getElementById('map-a-open-label');
    if (label) label.textContent = hasScheduledTime ? '指定時間' : showOpenOnly ? '営業中' : '全店舗';
  }

  function syncFilterLabel() {
    const selected = getEffectiveAdjustCategorySelection();
    const iekeiValues = getAdjustCategoryOptions('iekei').map(option => option.value);
    const isseValues = getAdjustCategoryOptions('isse').map(option => option.value);
    const hasIekei = iekeiValues.some(value => selected.has(value));
    const hasIsse = isseValues.some(value => selected.has(value));
    const label = hasIekei && !hasIsse ? '家系' : hasIsse && !hasIekei ? '壱系' : '';
    const badge = document.getElementById('map-a-filter-label');
    if (!badge) return;
    badge.textContent = label;
    badge.classList.toggle('is-visible', !!label);
    badge.setAttribute('aria-hidden', String(!label));
  }

  function openSearchSurface(options = {}) {
    closeAdjustPanel();
    const surface = document.getElementById('map-a-search-surface');
    const input = document.getElementById('map-a-search-input');
    if (!surface || !input) return;
    const wasOpen = surface.classList.contains('is-open');
    surface.classList.add('is-open');
    surface.setAttribute('aria-hidden', 'false');
    document.body.classList.add('map-a-search-open');
    if (!wasOpen && !options.fromHistory) {
      try {
        const currentState = history.state && typeof history.state === 'object' ? history.state : {};
        history.pushState({ ...currentState, [SEARCH_HISTORY_STATE]: true }, '', window.location.href);
      } catch (_) {}
    }
    renderSearchResults();
    setTimeout(() => input.focus(), 40);
  }

  function closeSearchSurface(options = {}) {
    const surface = document.getElementById('map-a-search-surface');
    const wasOpen = !!surface?.classList.contains('is-open');
    surface?.classList.remove('is-open');
    surface?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('map-a-search-open');
    document.getElementById('map-a-search-input')?.blur();
    cancelPlaceSearch(false);
    if (wasOpen && !options.fromHistory) {
      try {
        if (history.state?.[SEARCH_HISTORY_STATE]) history.back();
      } catch (_) {}
    }
  }

  function clearSearchHistoryFlag() {
    try {
      const currentState = history.state && typeof history.state === 'object' ? { ...history.state } : {};
      delete currentState[SEARCH_HISTORY_STATE];
      history.replaceState(currentState, '', window.location.href);
    } catch (_) {}
  }

  function setSearchTab(tab) {
    if (tab !== 'shops' && tab !== 'places') return;
    state.searchTab = tab;
    document.querySelectorAll('[data-map-a-search-tab]').forEach(button => {
      const active = button.dataset.mapASearchTab === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (tab === 'places') schedulePlaceSearch(true);
    else {
      cancelPlaceSearch(true);
      renderSearchResults();
    }
  }

  function renderSearchResults() {
    const results = document.getElementById('map-a-search-results');
    const input = document.getElementById('map-a-search-input');
    if (!results || !input) return;
    if (state.searchTab === 'shops') renderShopSearchResults(results, input.value.trim());
    else renderPlaceSearchResults(results, input.value.trim());
  }

  function renderShopSearchResults(container, query) {
    const normalized = normalizeSearch(query);
    const center = getMapFocusLatLng();
    let candidates = (Array.isArray(shops) ? shops : []).filter(shop =>
      shop.name !== 'ダミー' && Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng))
    );
    if (normalized) {
      candidates = candidates.filter(shop => [shop.name, shop.nameHiragana, shop.area, shop.category]
        .some(value => normalizeSearch(value).includes(normalized)));
    }
    candidates = candidates.map(shop => ({
      shop,
      distance: Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng))
        ? calculateDistance(center.lat, center.lng, Number(shop.lat), Number(shop.lng))
        : Infinity
    })).sort((a, b) => a.distance - b.distance);
    const totalCount = candidates.length;
    candidates = candidates.slice(0, 60);
    const count = document.getElementById('map-a-shop-count');
    if (count) count.textContent = String(totalCount);
    if (!candidates.length) {
      container.innerHTML = '<div class="map-a-search-state"><strong>お店が見つかりませんでした</strong><span>店名、ひらがな、エリアを変えて試してください。</span></div>';
      return;
    }
    container.innerHTML = `
      <div class="map-a-search-summary">${normalized ? `「${escapeText(query)}」の店舗検索結果` : '地図の中心付近にある店舗'}</div>
      <div class="map-a-result-list">
        ${candidates.map(({ shop, distance }) => {
          const status = getOpenStatus(shop.openingHours);
          const statusLabel = status.state === 'open' ? '営業中' : status.state === 'soon' ? '閉店間近' : '時間外';
          return `<button class="map-a-result-row" type="button" data-map-a-shop-result="${escapeAttribute(shop.id)}">
            <span class="map-a-result-icon">🍜</span>
            <span class="map-a-result-copy"><strong>${escapeText(shop.name)}</strong><span>${escapeText(getShortCategoryName(shop.category))} · ${escapeText(shop.area || '')} · ${statusLabel}</span></span>
            <span class="map-a-result-distance">${Number.isFinite(distance) ? formatDistance(distance) : ''}</span>
          </button>`;
        }).join('')}
      </div>`;
  }

  function renderPlaceSearchResults(container, query) {
    const count = document.getElementById('map-a-place-count');
    if (count) count.textContent = String(state.placeResults.length);
    if (query.length < 2) {
      container.innerHTML = '<div class="map-a-search-state"><strong>駅名・地名を2文字以上入力</strong><span>駅、住所、IC・JCTを国土地理院とHeartRailsから検索します。</span></div>';
      return;
    }
    if (state.placeLoading) {
      container.innerHTML = '<div class="map-a-search-state"><strong>地点を検索中…</strong><span>候補をまとめています。</span></div>';
      return;
    }
    if (state.placeError) {
      container.innerHTML = `<div class="map-a-search-state"><strong>地点を検索できませんでした</strong><span>${escapeText(state.placeError)}</span></div>`;
      return;
    }
    if (!state.placeResults.length) {
      container.innerHTML = '<div class="map-a-search-state"><strong>地点が見つかりませんでした</strong><span>別の駅名・地名で試してください。</span></div>';
      return;
    }
    container.innerHTML = `
      <div class="map-a-search-summary">「${escapeText(query)}」の地名・駅検索結果</div>
      <div class="map-a-result-list">
        ${state.placeResults.map((place, index) => `<button class="map-a-result-row" type="button" data-map-a-place-result="${index}">
          <span class="map-a-result-icon">${place.type === 'station' ? '駅' : '⌖'}</span>
          <span class="map-a-result-copy"><strong>${escapeText(place.name)}</strong><span>${escapeText(place.meta || (place.type === 'station' ? '駅' : '地名・住所'))}</span></span>
          <span class="map-a-result-distance">${icons.chevron}</span>
        </button>`).join('')}
      </div>`;
  }

  function schedulePlaceSearch(immediate = false) {
    cancelPlaceSearch(true);
    const query = document.getElementById('map-a-search-input')?.value.trim() || '';
    if (state.searchTab !== 'places' || query.length < 2) {
      renderSearchResults();
      return;
    }
    state.placeLoading = true;
    state.placeError = '';
    state.placeResults = [];
    renderSearchResults();
    state.placeTimer = window.setTimeout(() => runPlaceSearch(query), immediate ? 0 : PLACE_SEARCH_DELAY);
  }

  function cancelPlaceSearch(clearResults) {
    window.clearTimeout(state.placeTimer);
    state.placeTimer = 0;
    state.placeController?.abort();
    state.placeController = null;
    state.placeSequence += 1;
    state.placeLoading = false;
    if (clearResults) state.placeResults = [];
  }

  async function runPlaceSearch(query) {
    const querySnapshot = String(query || '').trim();
    if (querySnapshot.length < 2) return;
    window.clearTimeout(state.placeTimer);
    state.placeTimer = 0;
    state.placeController?.abort();
    state.placeController = new AbortController();
    const sequence = ++state.placeSequence;
    const controller = state.placeController;
    state.placeLoading = true;
    state.placeError = '';
    state.placeResults = [];
    renderSearchResults();
    try {
      const [gsiResponse, stationResponse] = await Promise.allSettled([
        fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(querySnapshot)}`, { signal: controller.signal }),
        fetch(`https://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(querySnapshot.replace(/駅$/, ''))}`, { signal: controller.signal })
      ]);
      if (sequence !== state.placeSequence) return;
      const results = [];
      const seen = new Set();
      if (stationResponse.status === 'fulfilled' && stationResponse.value.ok) {
        const stationData = await stationResponse.value.json().catch(() => ({}));
        (stationData?.response?.station || []).slice(0, 8).forEach(station => {
          const key = `${station.name}_${station.prefecture}`;
          if (seen.has(key)) return;
          seen.add(key);
          results.push({
            name: `${station.name}駅`,
            meta: `${station.prefecture} · ${station.line}`,
            lat: Number(station.y), lng: Number(station.x), type: 'station'
          });
        });
      }
      if (gsiResponse.status === 'fulfilled' && gsiResponse.value.ok) {
        const gsiData = await gsiResponse.value.json().catch(() => []);
        (Array.isArray(gsiData) ? gsiData : []).slice(0, 16).forEach(item => {
          const title = item?.properties?.title;
          const coordinates = item?.geometry?.coordinates;
          if (!title || !Array.isArray(coordinates)) return;
          const key = `${title}_${coordinates.join('_')}`;
          if (seen.has(key)) return;
          seen.add(key);
          const isStation = title.endsWith('駅');
          const isInterchange = /(?:ＩＣ|IC|ＪＣＴ|JCT)$/.test(title);
          results.push({
            name: title,
            meta: isStation ? '駅' : isInterchange ? 'IC・JCT' : '地名・住所',
            lat: Number(coordinates[1]), lng: Number(coordinates[0]), type: isStation ? 'station' : 'place'
          });
        });
      }
      const currentQuery = document.getElementById('map-a-search-input')?.value.trim() || '';
      if (sequence !== state.placeSequence || currentQuery !== querySnapshot || state.searchTab !== 'places') return;
      state.placeResults = results.filter(place => Number.isFinite(place.lat) && Number.isFinite(place.lng)).slice(0, 20);
      state.placeLoading = false;
      state.placeController = null;
      const gsiFailed = gsiResponse.status === 'rejected' || !gsiResponse.value.ok;
      const stationFailed = stationResponse.status === 'rejected' || !stationResponse.value.ok;
      if (!state.placeResults.length && gsiFailed && stationFailed) {
        state.placeError = '通信状況を確認して、もう一度お試しください。';
      }
      renderSearchResults();
    } catch (error) {
      if (error?.name === 'AbortError' || sequence !== state.placeSequence) return;
      state.placeLoading = false;
      state.placeController = null;
      state.placeError = '通信状況を確認して、もう一度お試しください。';
      renderSearchResults();
    }
  }

  function handleSearchResultClick(event) {
    const shopRow = event.target.closest('[data-map-a-shop-result]');
    if (shopRow) {
      const shop = findShop(shopRow.dataset.mapAShopResult);
      if (!shop) return;
      closeSearchSurface();
      state.forceShopId = shop.id;
      state.activeShopId = shop.id;
      updateMarkers();
      if (map && Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng))) {
        markProgrammaticMapMove('shop-search');
        map.setView([Number(shop.lat), Number(shop.lng)], Math.max(13, map.getZoom()), { animate: true });
      }
      setTimeout(() => {
        renderRail({ preserveActive: true, scrollToShopId: shop.id });
        selectMapShop(shop.id);
      }, 260);
      return;
    }
    const placeRow = event.target.closest('[data-map-a-place-result]');
    if (placeRow) {
      const place = state.placeResults[Number(placeRow.dataset.mapAPlaceResult)];
      if (!place) return;
      closeSearchSurface();
      markProgrammaticMapMove('place-search');
      applyLocationPoint(place.lat, place.lng, place.name);
      setTimeout(() => renderRail({ selectFirst: true, resetScroll: true }), 300);
    }
  }

  function setMapUiMode(mode) {
    if (mode !== 'a' && mode !== 'classic') return;
    closeSearchSurface();
    closeAdjustPanel();
    releaseForcedShopMarker();
    if (mode === 'a') clearClassicSearchFilter();
    document.documentElement.dataset.mapUi = mode;
    syncSelectedShopIndicator(mode === 'a' ? state.activeShopId : null);
    try {
      localStorage.setItem(MODE_KEY, mode);
      const url = new URL(window.location.href);
      if (url.searchParams.has('mapUi')) {
        url.searchParams.delete('mapUi');
        history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch (_) {}
    syncMapUiSetting();
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
    if (map) {
      updateMarkers();
      renderShopList();
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, animate: false });
        if (mode === 'a') renderRail({ preserveActive: true });
      });
    }
  }

  function syncMapUiSetting() {
    document.querySelectorAll('[data-map-ui-mode]').forEach(button => {
      const active = button.dataset.mapUiMode === document.documentElement.dataset.mapUi;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function setChecked(id, value) {
    const input = document.getElementById(id);
    if (input) input.checked = !!value;
  }

  function setRadio(name, value) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function getRadioValue(name, fallback) {
    return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
  }

  function findShop(shopId) {
    return (Array.isArray(shops) ? shops : []).find(shop => String(shop.id) === String(shopId));
  }

  function normalizeSearch(value) {
    return String(value || '').normalize('NFKC').toLocaleLowerCase('ja').replace(/[\s　]+/g, '');
  }

  function formatDistance(distanceKm) {
    if (!Number.isFinite(distanceKm)) return '';
    if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)}m`;
    if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
    return `${Math.round(distanceKm)}km`;
  }

  function escapeText(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeText(value).replace(/`/g, '&#96;');
  }

  window.setMapUiMode = setMapUiMode;
  window.getShopMapLabel = getShopMapLabel;
  window.syncMapShopLabels = syncMapShopLabels;
})();
