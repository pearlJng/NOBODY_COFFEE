/* =========================================================
   NOBODY COFFEE — interactions
   1. 모바일 메뉴 열기 · 닫기
   2. 워드마크 → 헤더 로고 이동 · 히어로 슬라이드 · 점장 연결선 · 현재 메뉴 표시
   3. 스크롤 리빌 · 카운트업
   4. 매장의 하루 타임라인
   5. 가맹 절차 연결선
   6. FAQ 아코디언
   7. 상담 문의 폼
   ========================================================= */

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ---------- 1. 모바일 메뉴 ---------- */
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');

  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    // 메뉴가 열리면 워드마크를 헤더 로고 자리로 붙여 메뉴 패널과 겹치지 않게
    wordmark.classList.add('is-docking');
    updateHeader();
    clearTimeout(dockTimer);
    dockTimer = setTimeout(() => wordmark.classList.remove('is-docking'), 400);
  };
  let dockTimer = null;
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', e => {
    if (nav.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
  });
  window.matchMedia('(min-width: 769px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  /* ---------- 2. 워드마크 → 헤더 로고 ---------- */
  // 히어로의 큰 워드마크(fixed)가 스크롤 양에 비례해 줄어들며 헤더 로고 자리로 이동한다.
  // 위치·크기는 transform 으로만 바꾸고, 시작·목표 값은 resize 때만 다시 잰다.
  const wordmark = document.getElementById('wordmark');
  const wmSpacer = document.getElementById('wmSpacer');
  const logoSlot = document.getElementById('logoSlot');
  // 스무스 스크롤 라이브러리(Lenis)를 붙이면 그 스크롤 값을 기준으로 계산
  const getScroll = () => (window.lenis ? window.lenis.scroll : window.scrollY);
  let wm = null;

  const measureWordmark = () => {
    const y = getScroll();
    const sp = wmSpacer.getBoundingClientRect();
    const slot = logoSlot.getBoundingClientRect();
    const headerH = header.offsetHeight;
    const scaleEnd = slot.width / sp.width;
    wordmark.style.setProperty('--wm-w', `${sp.width}px`);
    wm = {
      startX: sp.left,
      startY: sp.top + y,                              // 스크롤 0일 때 히어로 속 위치
      endX: slot.left,                                 // 헤더 좌측 패딩
      endY: (headerH - sp.height * scaleEnd) / 2,      // 헤더 세로 중앙
      scaleEnd,
      distance: Math.max(sp.height, 120),              // D ≈ 워드마크 높이
      leaveAt: Math.max(1, sp.top + y - headerH),      // 워드마크가 헤더에 닿는 시점(메뉴와 겹치기 전에 전환)
    };
  };

  const updateHeader = () => {
    if (!wm) return;
    const y = getScroll();
    const docked = nav.classList.contains('is-open');
    let p;
    if (reduceMotion) p = docked || y >= wm.leaveAt ? 1 : 0;
    else p = docked ? 1 : clamp(y / wm.distance);

    const e = reduceMotion ? p : easeOut(p);
    const s = 1 + (wm.scaleEnd - 1) * e;
    const x = wm.startX + (wm.endX - wm.startX) * e;
    // 모션 줄이기: 애니메이션 없이 페이지와 함께 올라가다가, 히어로를 벗어나면 헤더 로고로 바뀜
    const ty = reduceMotion && p === 0 ? wm.startY - y : wm.startY + (wm.endY - wm.startY) * e;

    wordmark.style.transform = `translate3d(${x.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    header.classList.toggle('is-scrolled', reduceMotion ? p === 1 : p > 0.6);
  };

  wordmark.addEventListener('click', e => {
    e.preventDefault();
    if (nav.classList.contains('is-open')) setMenu(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- 히어로 슬라이드 ---------- */
  // 약 3초마다 다음 사진을 현재 사진 위에 올려 왼쪽 → 오른쪽으로 펼친다
  const heroSlides = [...document.querySelectorAll('.hero__slide')];
  let slideIndex = 0;

  const nextSlide = () => {
    const next = heroSlides[(slideIndex + 1) % heroSlides.length];
    if (document.hidden || !next.complete) return;   // 탭이 가려졌거나 사진이 아직 안 왔으면 다음 차례로
    const cur = heroSlides[slideIndex];
    slideIndex = heroSlides.indexOf(next);
    cur.classList.remove('is-current', 'is-intro');
    cur.classList.add('is-prev');
    next.classList.add('is-entering');
    next.addEventListener('animationend', () => {
      next.classList.replace('is-entering', 'is-current');
      cur.classList.remove('is-prev');
    }, { once: true });
  };
  if (heroSlides.length > 1) setInterval(nextSlide, 3000);

  /* ---------- 현재 메뉴 ---------- */

  const navLinks = [...document.querySelectorAll('.nav a')];
  const navTargets = navLinks.map(a => document.querySelector(a.getAttribute('href')));
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a, i) => a.classList.toggle('is-current', navTargets[i] === entry.target));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navTargets.forEach(t => t && navObserver.observe(t));

  // 메뉴 대상이 아닌 섹션에 들어오면 표시 해제
  const clearObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) navLinks.forEach(a => a.classList.remove('is-current'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main > section').forEach(s => {
    if (!navTargets.includes(s)) clearObserver.observe(s);
  });

  /* ---------- 3. 리빌 · 카운트업 ---------- */
  const formatCount = (value, decimals) => value.toFixed(decimals);

  const countUp = el => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    if (reduceMotion) { el.textContent = formatCount(target, decimals); return; }
    const duration = 1400;
    const start = performance.now();
    const step = now => {
      const t = clamp((now - start) / duration);
      el.textContent = formatCount(target * easeOut(t), decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const counters = document.querySelectorAll('[data-count]');
  if (!reduceMotion) {
    counters.forEach(el => { el.textContent = formatCount(0, parseInt(el.dataset.decimals || '0', 10)); });
  }

  const reveal = el => {
    el.classList.add('is-in');
    el.querySelectorAll('[data-count]').forEach(countUp);
    // 등장 지연이 hover 반응에 남지 않도록 정리
    setTimeout(() => el.classList.add('is-settled'), 1600);
  };

  const revealTargets = document.querySelectorAll('[data-reveal]');
  if (reduceMotion) {
    revealTargets.forEach(reveal);
  } else {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(el => revealObserver.observe(el));
  }

  // 박스 형광펜(.mark)은 타이틀이 화면 위쪽 2/3 안으로 들어왔을 때 그어서, 그어지는 모습이 눈에 띄게
  const marks = document.querySelectorAll('.mark');
  if (reduceMotion) {
    marks.forEach(m => m.classList.add('is-drawn'));
  } else {
    const markObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-drawn');
        markObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -35% 0px' });
    marks.forEach(m => markObserver.observe(m));
  }

  /* ---------- 4. 매장의 하루 ---------- */
  // 스크롤 구간을 단계 수만큼 나눠, 지금 단계의 시계 · 눈금 · 본사/점주 문구 · 매장 사진 · 아이콘을 함께 바꾼다
  const day = document.getElementById('day');
  const dayScroller = document.getElementById('dayScroller');
  const dayStage = document.getElementById('dayStage');
  const dayTicks = [...day.querySelectorAll('.day-tick')];
  const daySteps = [...day.querySelectorAll('.day-step, .day-icon')];
  const ownerSteps = [...day.querySelectorAll('.day-panel--owner .day-step')];
  const dayFill = document.getElementById('dayFill');
  const dayClock = document.getElementById('dayClock');
  const dayPhotos = [...day.querySelectorAll('.day-panel--hq .ph')];
  const counterValue = document.getElementById('dayCounterValue');
  const stepCount = dayTicks.length;

  // 점주님이 쓴 시간(초) 누적값
  const ownerTotals = ownerSteps.reduce((acc, step, i) => {
    acc.push((acc[i - 1] || 0) + parseInt(step.dataset.owner, 10));
    return acc;
  }, []);

  let activeIndex = -1;
  let shownSeconds = 0;
  let counterRaf = null;
  let isFinal = false;

  const formatClock = sec => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const animateCounter = target => {
    cancelAnimationFrame(counterRaf);
    counterValue.classList.remove('is-final');
    if (reduceMotion) {
      shownSeconds = target;
      counterValue.textContent = formatClock(target);
      return;
    }
    const from = shownSeconds;
    const start = performance.now();
    const step = now => {
      const t = clamp((now - start) / 700);
      shownSeconds = from + (target - from) * easeOut(t);
      counterValue.textContent = formatClock(shownSeconds);
      if (t < 1) counterRaf = requestAnimationFrame(step);
    };
    counterRaf = requestAnimationFrame(step);
  };

  const setFinal = final => {
    if (final === isFinal) return;
    isFinal = final;
    if (final) {
      cancelAnimationFrame(counterRaf);
      shownSeconds = ownerTotals[ownerTotals.length - 1];
      counterValue.textContent = '약 6분';
      counterValue.classList.add('is-final');
    } else {
      animateCounter(ownerTotals[activeIndex]);
    }
  };

  const setActiveStep = index => {
    activeIndex = index;
    dayTicks.forEach((tick, i) => {
      tick.classList.toggle('is-active', i === index);
      tick.classList.toggle('is-past', i < index);
    });
    daySteps.forEach(el => el.classList.toggle('is-active', +el.dataset.i === index));

    const tick = dayTicks[index];
    dayClock.textContent = tick.dataset.time;
    if (!reduceMotion) {
      dayClock.classList.remove('tick');
      void dayClock.offsetWidth;          // 애니메이션 재시작
      dayClock.classList.add('tick');
    }
    dayPhotos.forEach(ph => ph.classList.toggle('is-active', ph.dataset.phase === tick.dataset.phase));

    if (!isFinal) animateCounter(ownerTotals[index]);
  };

  const updateDay = () => {
    const travel = dayScroller.offsetHeight - dayStage.offsetHeight;
    const stickTop = parseFloat(getComputedStyle(dayStage).top) || 0;
    const progress = travel > 0 ? clamp((stickTop - dayScroller.getBoundingClientRect().top) / travel) : 0;

    dayFill.style.transform = `scaleX(${progress})`;
    day.style.setProperty('--p', progress.toFixed(3));

    const index = Math.min(stepCount - 1, Math.floor(progress * stepCount));
    if (index !== activeIndex) setActiveStep(index);

    setFinal(progress >= 1);   // 하루 끝까지 내려오면 누적 시간을 "약 6분"으로 마무리
  };

  /* ---------- 5. 가맹 절차 연결선 ---------- */
  const steps = document.getElementById('steps');
  const stepsFill = document.getElementById('stepsFill');
  const stepItems = [...steps.querySelectorAll('.step')];

  const updateSteps = () => {
    const vh = window.innerHeight;
    const progress = reduceMotion ? 1 : clamp((vh * 0.8 - steps.getBoundingClientRect().top) / (vh * 0.45));
    stepsFill.style.transform = `scaleX(${progress})`;
    stepItems.forEach((step, i) => {
      step.classList.toggle('is-on', progress >= i / (stepItems.length - 1) - 0.001 && progress > 0);
    });
  };

  /* ---------- 스크롤 루프 ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateHeader();
      updateDay();
      updateSteps();
      ticking = false;
    });
  };
  const onResize = () => { measureWordmark(); onScroll(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if (document.fonts) document.fonts.ready.then(onResize);
  measureWordmark();
  updateHeader();
  wordmark.classList.add('is-ready');
  updateDay();
  updateSteps();

  /* ---------- 6. FAQ 아코디언 ---------- */
  const accItems = [...document.querySelectorAll('.acc-item')];
  accItems.forEach(item => {
    const btn = item.querySelector('.acc-q');
    btn.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      accItems.forEach(other => {
        other.classList.remove('is-open');
        other.querySelector('.acc-q').setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- 7. 상담 문의 폼 ---------- */
  const form = document.getElementById('contactForm');
  const formDone = document.getElementById('formDone');
  const phone = document.getElementById('f-phone');

  // 숫자만 받아 010-0000-0000 형태로 정리
  phone.addEventListener('input', () => {
    const d = phone.value.replace(/\D/g, '').slice(0, 11);
    phone.value = d.length < 4 ? d
      : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}`
      : d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
      : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  });

  const rules = {
    name: v => v.trim().length > 0,
    phone: v => /^01[016789]-\d{3,4}-\d{4}$/.test(v),
    region: v => v.trim().length > 0,
  };

  const setFieldState = (input, valid) => {
    const field = input.closest('.field');
    const error = field.querySelector('.field__error');
    field.classList.toggle('is-invalid', !valid);
    input.setAttribute('aria-invalid', String(!valid));
    error.textContent = valid ? '' : error.dataset.msg;
  };

  Object.keys(rules).forEach(name => {
    const input = form.elements[name];
    input.addEventListener('input', () => {
      if (input.closest('.field').classList.contains('is-invalid')) setFieldState(input, rules[name](input.value));
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let firstInvalid = null;
    Object.entries(rules).forEach(([name, test]) => {
      const input = form.elements[name];
      const valid = test(input.value);
      setFieldState(input, valid);
      if (!valid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }

    form.hidden = true;
    formDone.hidden = false;
    formDone.focus();
  });
})();
