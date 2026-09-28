/* =========================================================
   NOBODY COFFEE — interactions
   1. 이미지 플레이스홀더 → 실제 이미지 자동 교체
   2. 헤더 스크롤 상태 · 현재 메뉴 표시
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

  /* ---------- 1. 플레이스홀더 → 이미지 ---------- */
  // asset/img/ 에 data-src 와 같은 이름의 파일이 있으면 회색 박스 대신 표시
  document.querySelectorAll('.ph[data-src]').forEach(ph => {
    const label = ph.querySelector('.ph__label');
    const img = new Image();
    img.decoding = 'async';
    img.alt = label ? label.textContent.replace(label.querySelector('b')?.textContent || '', '').trim() : '';
    img.onload = () => {
      ph.prepend(img);
      ph.classList.add('has-img');
    };
    img.src = ph.dataset.src;
  });

  /* ---------- 2. 헤더 · 현재 메뉴 ---------- */
  const header = document.getElementById('header');
  const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 40);

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

  /* ---------- 4. 매장의 하루 ---------- */
  const day = document.getElementById('day');
  const dayList = day.querySelector('.day__list');
  const dayCards = [...day.querySelectorAll('.day-card')];
  const dayTrack = day.querySelector('.day__track');
  const dayFill = document.getElementById('dayFill');
  const dayClock = document.getElementById('dayClock');
  const dayPhotos = [...day.querySelectorAll('.day__photos .ph')];
  const dayEnd = document.getElementById('dayEnd');
  const counterValue = document.getElementById('dayCounterValue');

  // 점주님이 쓴 시간(초) 누적값
  const ownerTotals = dayCards.reduce((acc, card, i) => {
    acc.push((acc[i - 1] || 0) + parseInt(card.dataset.owner, 10));
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

  const setActiveCard = index => {
    activeIndex = index;
    dayCards.forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
      card.classList.toggle('is-past', i < index);
    });

    const card = dayCards[index];
    dayClock.textContent = card.dataset.time;
    if (!reduceMotion) {
      dayClock.classList.remove('tick');
      void dayClock.offsetWidth;          // 애니메이션 재시작
      dayClock.classList.add('tick');
    }
    dayPhotos.forEach(ph => ph.classList.toggle('is-active', ph.dataset.phase === card.dataset.phase));

    if (!isFinal) animateCounter(ownerTotals[index]);
  };

  const layoutDayTrack = () => {
    dayTrack.style.top = `${dayList.offsetTop}px`;
    dayTrack.style.height = `${dayList.offsetHeight}px`;
  };

  const updateDay = () => {
    const mid = window.innerHeight * 0.5;
    const rect = dayList.getBoundingClientRect();
    const progress = clamp((mid - rect.top) / rect.height);

    dayFill.style.transform = `scaleY(${progress})`;
    day.style.setProperty('--p', progress.toFixed(3));

    let index = 0;
    dayCards.forEach((card, i) => {
      if (card.getBoundingClientRect().top < mid) index = i;
    });
    if (index !== activeIndex) setActiveCard(index);

    setFinal(dayEnd.getBoundingClientRect().top < window.innerHeight * 0.8);
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
  const onResize = () => { layoutDayTrack(); onScroll(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if (document.fonts) document.fonts.ready.then(onResize);
  layoutDayTrack();
  updateHeader();
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
