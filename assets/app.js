(() => {
  'use strict';

  /* ---------- мобильное меню ---------- */
  const burger = document.getElementById('burger');
  const mnav = document.getElementById('mnav');
  const toggleNav = open => {
    mnav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    burger.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu');
  };
  burger.addEventListener('click', () => toggleNav(!mnav.classList.contains('open')));
  mnav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggleNav(false); });

  /* ---------- выпадающее подменю в шапке ----------
     Наведение обрабатывает CSS. Здесь — клавиатура и тач, где hover не работает:
     клик открывает, Escape и клик снаружи закрывают, aria-expanded держится в синхроне. */
  const groups = [...document.querySelectorAll('.nav-group')];
  const closeGroups = except => groups.forEach(g => {
    if (g === except) return;
    g.classList.remove('open');
    g.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
  });
  groups.forEach(g => {
    const btn = g.querySelector('.nav-toggle');
    btn.addEventListener('click', () => {
      const open = !g.classList.contains('open');
      closeGroups(g);
      g.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    // уход фокуса за пределы группы закрывает её
    g.addEventListener('focusout', e => {
      if (!g.contains(e.relatedTarget)) {
        g.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });
  if (groups.length) {
    addEventListener('click', e => { if (!e.target.closest('.nav-group')) closeGroups(null); });
    addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const open = groups.find(g => g.classList.contains('open'));
      if (open) { closeGroups(null); open.querySelector('.nav-toggle').focus(); }
    });
  }

  /* ---------- аккордеон: открыт один пункт ---------- */
  const items = [...document.querySelectorAll('.acc details')];
  items.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) items.forEach(o => { if (o !== d) o.open = false; });
  }));

  /* ---------- модальное окно обращения ---------- */
  const modal = document.getElementById('modal');
  let lastFocused = null;

  const openModal = () => {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('locked');
    toggleNav(false);
    // фокус на первое поле, но только после отрисовки окна
    requestAnimationFrame(() => modal.querySelector('input')?.focus());
  };
  const closeModal = () => {
    modal.hidden = true;
    document.documentElement.classList.remove('locked');
    lastFocused?.focus();
  };

  document.querySelectorAll('[data-open-modal]').forEach(b => b.addEventListener('click', openModal));
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeModal));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // Фокус не должен уходить за пределы окна, пока оно открыто
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...modal.querySelectorAll('button, input, textarea, a[href]')]
      .filter(el => !el.disabled && el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- формы обращения ----------
     Их две: в модальном окне и в секции контактов. Логика общая и не знает про
     конкретные идентификаторы — обязательные поля берутся из [required],
     блок успеха указан в data-lead. Добавить третью форму можно одной разметкой. */
  document.querySelectorAll('form[data-lead]').forEach(form => {
    const success = document.querySelector(form.dataset.lead);
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[required]').forEach(el => {
        const bad = !el.value.trim();
        el.classList.toggle('err', bad);
        if (bad) ok = false;
      });
      if (!ok) { form.querySelector('.err')?.focus(); return; }
      // Точка интеграции: отправка на backend / почту / CRM
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    form.querySelectorAll('input, textarea').forEach(i =>
      i.addEventListener('input', () => i.classList.remove('err')));
  });

  /* ---------- входной таймлайн и счётчики на anime.js v4 ----------
     Прокрутка намеренно осталась на CSS: она идёт вне основного потока и не роняет
     кадры, пока страница догружается. anime.js берёт на себя то, где нужен JS —
     единожды проигрываемый вход и числовые счётчики.
     Внимание: v4 — это `ease`, а не `easing` из v3, и именованный импорт. */
  if (document.documentElement.classList.contains('rv')) {
    const revealAll = () => {
      document.querySelectorAll('[data-hero],[data-strip],.flow li').forEach(el => { el.style.opacity = '1'; });
      const rule = document.getElementById('hero-rule');
      if (rule) rule.style.transform = 'none';
    };

    import('https://cdn.jsdelivr.net/npm/animejs@4.5.0/+esm')
      .then(({ createTimeline, animate, stagger }) => {
        // Входной таймлайн есть только на главной. На внутренних страницах этих
        // элементов нет, и без проверки anime.js сыплет «No target found».
        if (document.querySelector('[data-hero]')) {
          createTimeline({ defaults: { ease: 'out(3)', duration: 620 } })
            .add('[data-hero]', { opacity: [0, 1], y: [18, 0], delay: stagger(70) })
            .add('#hero-rule', { scaleX: [0, 1], duration: 820, ease: 'out(4)' }, '-=460')
            .add('[data-strip]', { opacity: [0, 1], y: [10, 0], delay: stagger(55) }, '-=640');
        }

        // Счётчики запускаем при появлении в кадре, а не на загрузке
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;
        const run = el => {
          const pad = +(el.dataset.pad || 0);
          const state = { v: 0 };
          animate(state, {
            v: +el.dataset.count, duration: 900, ease: 'out(3)',
            onUpdate: () => { el.textContent = String(Math.round(state.v)).padStart(pad, '0'); }
          });
        };
        const cio = new IntersectionObserver((entries, obs) => {
          entries.forEach(en => { if (en.isIntersecting) { run(en.target); obs.unobserve(en.target); } });
        }, { threshold: .5 });
        counters.forEach(el => cio.observe(el));

        // Шаги в «Как мы работаем» набегают по одному: так читается последовательность,
        // а не просто «появился блок». Шаг стаггера 70 мс — длиннее делает страницу вялой.
        const flows = document.querySelectorAll('.flow');
        const fio = new IntersectionObserver((entries, obs) => {
          entries.forEach(en => {
            if (!en.isIntersecting) return;
            obs.unobserve(en.target);
            const items = en.target.querySelectorAll('li');
            animate(items, {
              opacity: [0, 1], x: [-10, 0],
              duration: 520, ease: 'out(3)', delay: stagger(70)
            });
            // Кружок с номером подхватывает тот же такт, но масштабом.
            // Стартуем с .8, а не с нуля: из ничего в реальном мире ничего не возникает.
            animate(en.target.querySelectorAll('li i'), {
              scale: [.8, 1], duration: 420, ease: 'out(4)', delay: stagger(70)
            });
          });
        }, { threshold: .25 });
        flows.forEach(el => fio.observe(el));
      })
      .catch(revealAll);   // CDN недоступен — показываем всё как есть

    // Подстраховка на случай, когда библиотека загрузилась, но анимация так и не пошла
    // (медленная сеть, сбой планировщика). Через 4 секунды контент показываем безусловно.
    setTimeout(() => {
      document.querySelectorAll('[data-hero],[data-strip]').forEach(el => {
        if (+getComputedStyle(el).opacity === 0) el.style.opacity = '1';
      });
      document.querySelectorAll('.flow li').forEach(el => {
        const r = el.getBoundingClientRect();
        const seen = r.top < innerHeight && r.bottom > 0;
        if (seen && +getComputedStyle(el).opacity === 0) el.style.opacity = '1';
      });
    }, 4000);
  }

  /* ---------- reveal при скролле ----------
     Отступ в пикселях, а не в процентах: процент растёт вместе с высотой экрана,
     и на высоком вьюпорте нижние блоки могут не попасть в зону срабатывания. */
  if (document.documentElement.classList.contains('rv')) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -48px 0px', threshold: 0 });
    document.querySelectorAll('[data-rv]').forEach(el => io.observe(el));
  }
})();
