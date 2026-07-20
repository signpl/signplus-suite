(() => {
  const content = document.querySelector('.content');
  const nav = [...document.querySelectorAll('.nav-item')];
  const money = (n) => new Intl.NumberFormat('ko-KR').format(Math.round(Number(n) || 0));
  const dashboard = content.innerHTML;

  function setActive(label) {
    nav.forEach((item) => item.classList.toggle('active', item.textContent.includes(label)));
  }

  function renderQuote() {
    setActive('견적 관리');
    content.innerHTML = `<div class="welcome"><div><p class="eyebrow">QUOTE BUILDER</p><h1>견적 계산기</h1><p class="sub">수신처와 품목을 입력하면 견적 금액을 바로 계산합니다.</p></div><button class="secondary" id="back-dashboard">← 대시보드</button></div>
      <section class="quote-layout"><div class="panel quote-form"><div class="panel-head"><div><h2>견적 정보</h2><p>기본 정보를 입력하세요.</p></div><span class="quote-badge">상담중</span></div>
      <div class="form-grid"><label>프로젝트명<input id="project" placeholder="춘천점 채널간판"></label><label>견적일자<input id="quote-date" type="date"></label><label>거래처명<input id="client" placeholder="거래처명을 입력하세요"></label><label>담당자 연락처<input placeholder="010-0000-0000"></label></div>
      <div class="items-head"><h2>품목</h2><button class="secondary small" id="add-item">＋ 품목 추가</button></div><div class="items" id="items"></div>
      <div class="quote-actions"><button class="secondary" id="reset-quote">초기화</button><button class="primary" id="save-quote">견적 저장</button></div></div>
      <aside class="panel quote-summary"><h2>견적 미리보기</h2><p class="summary-project" id="summary-project">프로젝트명을 입력하세요</p><div class="summary-lines"><div><span>공급가액</span><strong id="subtotal">₩ 0</strong></div><div><span>부가세 (10%)</span><strong id="vat">₩ 0</strong></div></div><div class="total"><span>합계</span><strong id="total">₩ 0</strong></div><p class="summary-note">※ 현재는 브라우저에 임시 저장됩니다.<br>NAS 연동 후 회사 계정별로 저장됩니다.</p></aside></section>`;
    const date = document.querySelector('#quote-date'); date.value = new Date().toISOString().slice(0, 10);
    const items = document.querySelector('#items');
    function addItem(name = '', spec = '', price = 0, qty = 1) {
      const row = document.createElement('div'); row.className = 'item-row';
      row.innerHTML = `<input class="item-name" placeholder="품목명" value="${name}"><input class="item-spec" placeholder="규격 / 사양" value="${spec}"><input class="item-price" type="number" min="0" placeholder="단가" value="${price}"><input class="item-qty" type="number" min="1" placeholder="수량" value="${qty}"><strong class="item-total">₩ 0</strong><button class="remove-item" aria-label="품목 삭제">×</button>`;
      items.appendChild(row); row.querySelectorAll('input').forEach((input) => input.addEventListener('input', recalc)); row.querySelector('.remove-item').addEventListener('click', () => { row.remove(); recalc(); }); recalc();
    }
    function recalc() { let subtotal = 0; document.querySelectorAll('.item-row').forEach((row) => { const total = (Number(row.querySelector('.item-price').value) || 0) * (Number(row.querySelector('.item-qty').value) || 0); subtotal += total; row.querySelector('.item-total').textContent = `₩ ${money(total)}`; }); const vat = subtotal * .1; document.querySelector('#subtotal').textContent = `₩ ${money(subtotal)}`; document.querySelector('#vat').textContent = `₩ ${money(vat)}`; document.querySelector('#total').textContent = `₩ ${money(subtotal + vat)}`; document.querySelector('#summary-project').textContent = document.querySelector('#project').value || '프로젝트명을 입력하세요'; }
    addItem('채널사인 제작', 'W3000 × H600', 850000, 1); addItem('LED 모듈 및 조립', '3구 2835 1W', 350, 75);
    document.querySelector('#add-item').addEventListener('click', () => addItem()); document.querySelector('#project').addEventListener('input', recalc);
    document.querySelector('#back-dashboard').addEventListener('click', () => { content.innerHTML = dashboard; setActive('대시보드'); bindDashboard(); });
    document.querySelector('#reset-quote').addEventListener('click', () => { items.innerHTML = ''; addItem(); });
    document.querySelector('#save-quote').addEventListener('click', () => { localStorage.setItem('signplus-last-quote', JSON.stringify({ project: document.querySelector('#project').value, client: document.querySelector('#client').value, savedAt: new Date().toISOString() })); alert('견적이 브라우저에 임시 저장되었습니다.'); });
  }
  function bindDashboard() { document.querySelector('.mobile-menu')?.addEventListener('click', () => alert('모바일 메뉴는 다음 단계에서 연결합니다.')); document.querySelector('.primary')?.addEventListener('click', renderQuote); nav.forEach((item) => item.addEventListener('click', (e) => { if (item.textContent.includes('견적 관리')) { e.preventDefault(); renderQuote(); } })); }
  bindDashboard();
})();
