import { useCallback, useEffect, useRef, useState } from 'react'
import { CATALOG } from './catalog.js'

// Сцены и тексты — DESIGN.md §1, §3. Строка в *звёздочках* — акцентная, цветом сцены.
const SCENES = [
  { id: 'kofeynya', label: 'Кофейня', side: 'left', focus: [0.62, 0.45], accent: 'var(--yellow)',
    title: ['Вода и', '*молоко*'], lead: 'Всё для кофейни — одной поставкой. 90% матрицы вашего бара' },
  // [ПРОВЕРИТЬ] формулировку про коров: компания — поставщик, а не ферма
  { id: 'moloko', label: 'Молоко', side: 'left', focus: [0.72, 0.55], accent: 'var(--yellow)',
    title: ['От хороших', '*коров*'], caption: '8 марок · от 3 г белка на 100 мл · идеальная пенка' },
  // [ПРОВЕРИТЬ] формулировку про источник
  { id: 'voda', label: 'Вода', side: 'right', focus: [0.3, 0.55], accent: 'var(--yellow)',
    title: ['Из', '*источника*'], caption: '0,5 / 1,5 / 2 и 19 л · соки в стекле',
    // [ПРОВЕРИТЬ] откуда вода: на сайте клиента источник не указан, дописать после ответа клиента
    lead: 'Питьевая вода для витрины и кулера — 0,5, 1,5, 2 и 19 литров. Соки 1 л и 0,2 л в стекле, разные вкусы' },
  { id: 'assortiment', label: 'Ассортимент', side: 'left', focus: [0.62, 0.5], accent: 'var(--green)',
    title: ['Всё для', '*бара*'], caption: 'Доставка пн–сб · СПб и ЛО · от 4000 ₽' },
  // ЗАГЛУШКА: заголовок «Давайте дружить»
  { id: 'zayavka', label: 'Контакты', side: 'left', focus: [0.75, 0.5], accent: 'var(--green-deep)',
    title: ['Давайте', '*дружить*'] },
]
const LAST = SCENES.length - 1

const DUR = matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 900

const fromHash = () => location.hash ? SCENES.findIndex(s => '#' + s.id === location.hash) : 0

// Может ли ближайший скроллящийся предок target прокрутиться дальше в эту сторону
function canScroll(target, down) {
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1)
      return down ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0
  }
  return false
}

function Title({ lines, as: H = 'h2', hRef }) {
  return (
    <H className="title" tabIndex={-1} ref={hRef}>
      {lines.map((l, i) => {
        const script = l.startsWith('*')
        return [i > 0 && ' ', <span key={i} className={'line' + (script ? ' script' : '')} style={{ '--i': i }}>
          <span>{script ? l.slice(1, -1) : l}</span>
        </span>]
      })}
    </H>
  )
}

export default function App() {
  const [[index, prev, dir], setNav] = useState(() => [Math.max(0, fromHash()), -1, 'none'])
  const [allImages, setAllImages] = useState(false)
  const [menu, setMenu] = useState(false)
  const [selected, setSelected] = useState([])
  const [toast, setToast] = useState(null)
  const indexRef = useRef(index)
  const lock = useRef(false)
  const headings = useRef([])

  indexRef.current = index

  const go = useCallback(n => {
    if (lock.current || n < 0 || n > LAST || n === indexRef.current) return
    location.hash = SCENES[n].id
  }, [])

  // Хэш — источник правды: ссылки, кнопка «назад» и go() идут через него
  useEffect(() => {
    const onHash = () => {
      const n = fromHash()
      if (n < 0 || n === indexRef.current) return
      setNav([n, indexRef.current, n > indexRef.current ? 'fwd' : 'back'])
      setMenu(false)
      lock.current = true
      setTimeout(() => { lock.current = false }, DUR + 300)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (dir !== 'none') headings.current[index]?.focus({ preventScroll: true })
  }, [index, dir])

  useEffect(() => {
    const ready = () => setAllImages(true)
    if (document.readyState === 'complete') ready()
    else addEventListener('load', ready)
    return () => removeEventListener('load', ready)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Колесо, свайп, клавиши. Один жест — одна сцена: новая сцена только после паузы в событиях колеса.
  useEffect(() => {
    const step = d => go(indexRef.current + d)
    let lastWheel = 0
    const onWheel = e => {
      const now = performance.now(), gap = now - lastWheel
      lastWheel = now
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX) || Math.abs(e.deltaY) < 4) return
      if (canScroll(e.target, e.deltaY > 0) || gap < 200) return
      step(e.deltaY > 0 ? 1 : -1)
    }
    let touch = null
    const onTouchStart = e => {
      const t = e.touches[0]
      touch = { x: t.clientX, y: t.clientY, down: canScroll(e.target, true), up: canScroll(e.target, false) }
    }
    const onTouchEnd = e => {
      if (!touch) return
      const t = e.changedTouches[0], dy = touch.y - t.clientY, dx = touch.x - t.clientX
      if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) && !(dy > 0 ? touch.down : touch.up)) step(dy > 0 ? 1 : -1)
      touch = null
    }
    const onKey = e => {
      if (e.target.closest('input, textarea, select, button, a')) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); step(1) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1) }
    }
    addEventListener('wheel', onWheel, { passive: true })
    addEventListener('touchstart', onTouchStart, { passive: true })
    addEventListener('touchend', onTouchEnd, { passive: true })
    addEventListener('keydown', onKey)
    return () => {
      removeEventListener('wheel', onWheel)
      removeEventListener('touchstart', onTouchStart)
      removeEventListener('touchend', onTouchEnd)
      removeEventListener('keydown', onKey)
    }
  }, [go])

  const onSceneClick = e => {
    if (e.target.closest('a, button, input, label, .copy, .cards, .panel, .footer, .author')) return
    go(indexRef.current + 1)
  }

  const toggle = title => {
    const on = selected.includes(title)
    setSelected(on ? selected.filter(t => t !== title) : [...selected, title])
    if (!on) setToast(`«${title}» — в заявке`)
  }

  const content = (s, i) => {
    const hRef = el => { headings.current[i] = el }
    const copy = extra => (
      <div className="copy">
        <p className="label">0{i + 1} / {s.label}</p>
        <Title lines={s.title} as={i === 0 ? 'h1' : 'h2'} hRef={hRef} />
        {s.lead && <p className="lead">{s.lead}</p>}
        {s.caption && <p className="label caption">{s.caption}</p>}
        {extra}
      </div>
    )
    if (i === 0) return copy(<a className="btn-yellow" href="#zayavka">Получить прайс <span aria-hidden>→</span></a>)
    if (i === 3) return <>
      {copy()}
      <ul className="cards">
        {CATALOG.map((c, k) => {
          const on = selected.includes(c.title)
          return (
            <li className="card" key={c.id} style={{ '--k': k }}>
              <img src={`/img/catalog/${c.id}.webp`} alt="" loading="lazy" />
              <h3>{c.title}</h3>
              <p>{c.line}</p>
              <button aria-pressed={on} onClick={() => toggle(c.title)}>{on ? 'В заявке ✓' : 'Запросить +'}</button>
            </li>
          )
        })}
      </ul>
    </>
    if (i === LAST) return <>
      <RequestForm scene={s} hRef={hRef} selected={selected} setSelected={setSelected} notify={setToast} />
      <aside className="author">
        <div className="author-name">Меня зовут Николай</div>
        <p>Я сделал для вас этот сайт и готов развивать его дальше:</p>
        <ul>
          <li>наполню реальными товарами, ценами и фактами о ваших поставщиках;</li>
          <li>оживлю сцены: трава колышется, вода бежит, облака плывут;</li>
          <li>или передам проект вашей команде.</li>
        </ul>
        <a className="author-tg label" href="https://t.me/volopopi" target="_blank" rel="noopener">Telegram @volopopi →</a>
      </aside>
      <p className="label order-note">Заказ от 4000 ₽ · доставка пн–сб</p>
      <footer className="footer label">
        <img src="/img/logo.png" alt="Вода и молоко" />
        <span>© {new Date().getFullYear()}</span>
        {/* ЗАГЛУШКИ: документы ещё не готовы */}
        <a href="#politika">Политика</a>
        <a href="#soglasie">Согласие на ПД</a>
        <a href="#kofeynya" className="footer-top">В начало ↑</a>
      </footer>
    </>
    return copy()
  }

  return (
    <>
      <header className={'header' + (menu ? ' menu-open' : '')}>
        <a className="logo" href="#kofeynya" aria-label="Вода и молоко — в начало">
          <img src="/img/logo.png" alt="" />
        </a>
        <nav className="nav label" id="menu">
          {SCENES.slice(1).map((s, k) => (
            <a key={s.id} href={'#' + s.id} className={index === k + 1 ? 'is-on' : undefined} onClick={() => setMenu(false)}>{s.label}</a>
          ))}
        </nav>
        <div className="header-right">
          <a className="phone label" href="tel:+78129506670">+7 (812) 950-66-70</a>
          <a className="pill label" href="#zayavka">Получить прайс</a>
          <button className="burger label" aria-expanded={menu} aria-controls="menu" onClick={() => setMenu(!menu)}>
            {menu ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </header>

      <main className="stage" data-dir={dir}>
        {SCENES.map((s, i) => {
          const state = i === index ? ' is-active' : i === prev ? ' is-leaving' : ''
          const pos = `${s.focus[0] * 100}% ${s.focus[1] * 100}%`
          const load = allImages || Math.abs(i - index) <= 1 || i === prev
          return (
            <section key={s.id} className={`scene scene--${s.id} side-${s.side}${state}`} aria-label={s.label}
              aria-hidden={i !== index} inert={i !== index ? '' : undefined} onClick={onSceneClick}
              style={{ '--accent': s.accent }}>
              <div className="bg" style={{ transformOrigin: pos }}>
                {load && <img src={`/img/scenes/${s.id}.webp`} alt="" style={{ objectPosition: pos }}
                  fetchpriority={i === index ? 'high' : undefined} />}
              </div>
              <div className="shade" />
              {content(s, i)}
            </section>
          )
        })}
      </main>

      <nav className="dots" aria-label="Сцены">
        {SCENES.map((s, i) => (
          <a key={s.id} href={'#' + s.id} data-n={'0' + (i + 1)} className={i === index ? 'is-on' : undefined}
            aria-label={s.label} aria-current={i === index ? 'step' : undefined} />
        ))}
      </nav>

      {index < LAST && (
        <a className="next label" href={'#' + SCENES[index + 1].id}>Далее <span aria-hidden>↓</span></a>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}

// Форма заявки — DESIGN.md §5. Без бэкенда: текст в буфер + t.me/volopopi?text=...
function RequestForm({ scene, hRef, selected, setSelected, notify }) {
  const [f, setF] = useState({ name: '', cafe: '', phone: '', consent: false })
  const [err, setErr] = useState({})
  const [adding, setAdding] = useState(false)

  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const addOwn = e => {
    const v = e.target.value.trim()
    if (v && !selected.includes(v)) setSelected([...selected, v])
    setAdding(false)
  }

  const submit = e => {
    e.preventDefault()
    const er = {}
    if (f.phone.replace(/\D/g, '').length < 10) er.phone = 'Укажите телефон — перезвоним по нему'
    if (!f.consent) er.consent = 'Нужно согласие на обработку данных'
    setErr(er)
    if (Object.keys(er).length) return
    const text = [
      'Заявка с сайта',
      f.name && `Имя: ${f.name}`,
      f.cafe && `Кофейня: ${f.cafe}`,
      `Телефон: ${f.phone}`,
      selected.length && `Интересует: ${selected.join(', ')}`,
    ].filter(Boolean).join('\n')
    navigator.clipboard?.writeText(text).catch(() => {})
    window.open('https://t.me/volopopi?text=' + encodeURIComponent(text), '_blank', 'noopener')
    notify('Заявка скопирована — вставьте её в чат, если не подставилась')
  }

  return (
    <div className="panel">
      <p className="label">05 / Заявка</p>
      <Title lines={scene.title} hRef={hRef} />
      <hr />
      <form noValidate onSubmit={submit}>
        <div className="field">
          <span className="flabel">Вы выбрали</span>
          <div className="chips">
            {selected.length === 0 && !adding && <a className="pick" href="#assortiment">выбрать в ассортименте ↑</a>}
            {selected.map(t => (
              <span className="chip" key={t}>{t}
                <button type="button" aria-label={`Убрать ${t}`} onClick={() => setSelected(selected.filter(x => x !== t))}>×</button>
              </span>
            ))}
            {adding
              ? <input className="chip-input" autoFocus placeholder="что ещё нужно" aria-label="Своя позиция" onBlur={addOwn}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOwn(e) } if (e.key === 'Escape') setAdding(false) }} />
              : <button type="button" className="chip chip--add" onClick={() => setAdding(true)}>+ своё</button>}
          </div>
        </div>
        <label className="field"><span className="flabel">Имя</span>
          <input value={f.name} onChange={set('name')} autoComplete="name" />
        </label>
        <label className="field"><span className="flabel">Кофейня</span>
          <input value={f.cafe} onChange={set('cafe')} autoComplete="organization" />
        </label>
        <label className="field"><span className="flabel">Телефон *</span>
          <input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="+7"
            aria-invalid={!!err.phone} aria-describedby={err.phone ? 'err-phone' : undefined} />
          {err.phone && <span className="err" id="err-phone">{err.phone}</span>}
        </label>
        <label className="check">
          <input type="checkbox" checked={f.consent} onChange={set('consent')}
            aria-invalid={!!err.consent} aria-describedby={err.consent ? 'err-consent' : undefined} />
          <span>Согласен на обработку персональных данных</span>
        </label>
        {err.consent && <span className="err" id="err-consent">{err.consent}</span>}
        <button className="submit label">Отправить в Telegram <span aria-hidden>→</span></button>
      </form>
      <hr />
      <div className="contacts label">
        <a href="tel:+78129506670">+7 (812) 950-66-70</a>
        <a href="https://t.me/volopopi" target="_blank" rel="noopener">@volopopi</a>
        <span>пн–сб</span>
      </div>
    </div>
  )
}
