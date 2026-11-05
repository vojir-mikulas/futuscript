(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=0,t=1,n=2,r=class{value;fn;isEffect;state;sources=[];observers=new Set;owner;children=null;cleanups=null;disposed=!1;constructor(t,r,i){this.value=t,this.fn=r,this.isEffect=i,this.state=r?n:e,this.owner=r?a:null,r&&a&&(a.children??=[]).push(this)}get(){return i&&!i.disposed&&!i.sources.includes(this)&&(i.sources.push(this),this.observers.add(i)),this.fn&&u(this),this.value}set(e){if(this.fn)throw Error(`computed hodnota se nedá přepsat`);if(Object.is(this.value,e))return e;this.value=e;for(let e of this.observers)l(e,n);return o||m(),e}notify(){for(let e of this.observers)l(e,n);o||m()}},i=null,a=null,o=0,s=!1,c=[];function l(n,r){if(n.state>=r)return;let i=n.state===e;if(n.state=r,i){if(n.isEffect)c.push(n);else for(let e of n.observers)l(e,t)}}function u(r){if(r.state===t){for(let e of r.sources)if(e.fn&&u(e),r.state===n)break}r.state===n&&d(r),r.state=e}function d(e){f(e);let t=i,r=a;i=e,a=e;try{let t=e.fn();if(e.isEffect)typeof t==`function`&&(e.cleanups??=[]).push(t);else if(!Object.is(t,e.value)){e.value=t;for(let t of e.observers)t.state=n}}finally{i=t,a=r}}function f(e){if(e.children){let t=e.children;e.children=null;for(let e of t)p(e)}if(e.cleanups){let t=e.cleanups;e.cleanups=null;for(let e of t)e()}if(e instanceof r){for(let t of e.sources)t.observers.delete(e);e.sources=[]}}function p(e){if(e.disposed)return;e.disposed=!0;let t=e.owner?.children;if(t){let n=t.indexOf(e);n>=0&&t.splice(n,1)}f(e)}function m(){if(!s){s=!0;try{for(let e=0;e<c.length;e++){let t=c[e];t.disposed||u(t)}}finally{c.length=0,s=!1}}}function h(e){return new r(e,null,!1)}function g(e){return new r(void 0,e,!1)}function _(t){let n=new r(void 0,t,!0);return d(n),n.state=e,()=>p(n)}function v(e){o++;try{return e()}finally{--o===0&&m()}}function y(e){let t=i;i=null;try{return e()}finally{i=t}}function b(e){let t={owner:a,children:null,cleanups:null,disposed:!1};a&&(a.children??=[]).push(t);let n=a,r=i;a=t,i=null;try{return e(()=>p(t))}finally{a=n,i=r}}function x(e){a&&(a.cleanups??=[]).push(e)}function S(){return a}function C(e,t){let n=a,r=i;a=e,i=null;try{return t()}finally{a=n,i=r}}var w=[];function T(){let e=w.splice(0);for(let{owner:t,fn:n}of e)t?.disposed||C(t,()=>_(n))}var E=Symbol.for(`futuscript.renderable`),D=e=>typeof e==`object`&&!!e&&E in e;function O(e){return e?typeof e==`string`?e:Array.isArray(e)?e.map(O).filter(Boolean).join(` `):typeof e==`object`?Object.entries(e).filter(([,e])=>e).map(([e])=>e).join(` `):String(e):``}function ee(e){return e==null||e===!1?null:typeof e==`object`?Object.entries(e).filter(([,e])=>e!=null&&e!==!1).map(([e,t])=>`${e.startsWith(`--`)?e:e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`)}:${t}`).join(`;`):String(e)}var te=e=>e==null||typeof e==`boolean`?``:String(e);h(0);var k=()=>document.createDocumentFragment(),A=()=>document.createComment(``),j=new WeakMap;function M(e){return j.has(e)?j.get(e):e.firstChild}function N(e,t){console.warn(`hydratace: čekal jsem ${e}, našel jsem`,t)}function P(e){let t=M(e);if(t?.nodeType===8)return j.set(e,t.nextSibling),t;N(`<!---->`,t);let n=A();return e.insertBefore(n,t),n}function F(e,t){let n=M(e);if(t&&n?.nodeType===3){let r=n;return r.data.length>t.length&&r.splitText(t.length),r.data!==t&&N(JSON.stringify(t),r),j.set(e,r.nextSibling),r}t&&N(JSON.stringify(t),n);let r=document.createTextNode(t);return e.insertBefore(r,n),r}function I(e){let t=A();return e.appendChild(t),t}function L(e,t){let n=document.createElement(t);return e.appendChild(n),n}function R(e,t){e.appendChild(document.createTextNode(t))}function z(e,t){let n=e;for(;n;){let e=n.nextSibling;if(n.parentNode?.removeChild(n),n===t)break;n=e}}function B(e,t){let n=e.nextSibling;for(;n&&n!==t;){let e=n.nextSibling;n.parentNode.removeChild(n),n=e}}function ne(e,t,n,r){let i=e;for(;i;){let e=i.nextSibling;if(n.insertBefore(i,r),i===t)break;i=e}}function V(e,t){let n=e.appendChild(document.createTextNode(``)),r=null;_(()=>{let i=t();if(D(i)){y(()=>{if(!n)r=P(e),b(()=>i[E](e)),n=F(e,``);else{n.data&&(n.data=``),r||(r=A(),n.parentNode.insertBefore(r,n));let e=k();b(()=>i[E](e)),n.parentNode.insertBefore(e,n)}let t=r,a=n;x(()=>B(t,a))});return}let a=te(i);n?n.data!==a&&(n.data=a):n=F(e,a)})}var H=new WeakSet;function U(e,t,n){_(()=>{let r=n();if(t===`action`&&typeof r==`function`&&r.url)return re(e,r);ie(e,t,r)})}function re(e,t){e.setAttribute(`action`,t.url),e.setAttribute(`method`,`post`),e.__futuAction=t,H.has(e)||(H.add(e),e.addEventListener(`submit`,t=>{t.preventDefault();let n=e.__futuAction;n(new FormData(e)).then(()=>e.reset())}))}function ie(e,t,n){n==null||n===!1?e.removeAttribute(t):e.setAttribute(t,n===!0?``:String(n))}function ae(e,t){_(()=>oe(e,t()))}function oe(e,t){let n=ee(t);n==null?e.removeAttribute(`style`):e.setAttribute(`style`,n)}function W(e,t,n){_(()=>{let r=O([t(),n]);e.setAttribute(`class`,r)})}function G(e,t,n){let r=t=>{let r=y(n);typeof r==`function`&&v(()=>r.call(e,t))};e.addEventListener(t,r),e instanceof Element||x(()=>e.removeEventListener(t,r))}function K(e,t,n){let r=I(e),i=I(e),a=g(()=>{for(let e=0;e<t.length;e++)if(t[e]())return e;return t.length});_(()=>{let t=n[a.get()];y(()=>{if(!i)t&&b(()=>t(e)),i=P(e);else if(t){let e=k();b(()=>t(e)),i.parentNode.insertBefore(e,i)}let n=i;t&&x(()=>B(r,n))})})}function q(e,t,n,r,i){let a=S(),o=I(e),s=new Map,c=null,l=t=>{if(!o){let n=P(e),r=C(a,()=>b(n=>(t(e),n)));return{start:n,end:P(e),dispose:r,f:null}}let n=A(),r=A(),i=k();i.appendChild(n);let s=C(a,()=>b(e=>(t(i),e)));return i.appendChild(r),{start:n,end:r,dispose:s,f:i}};_(()=>{let a=Array.from(t()??[]);y(()=>v(()=>{let t=new Map,u=[];a.forEach((e,i)=>{let a=n?n(e,i):i;t.has(a)&&(console.warn(`(<each>): klíč ${String(a)} je tu dvakrát, položky se můžou splést`),a=Symbol());let o=s.get(a);if(o)s.delete(a),o.item.set(e),o.index.set(i);else{let t=h(e),n=h(i),a=l(e=>r(e,t,n));o={start:a.start,end:a.end,item:t,index:n,dispose:a.dispose}}t.set(a,o),u.push(o)});for(let e of s.values())e.dispose(),z(e.start,e.end);if(s=t,!o){!u.length&&i&&(c=l(i)),o=P(e);return}let d=o.parentNode,f=o;for(let e=u.length-1;e>=0;e--){let t=u[e];t.end.nextSibling!==f&&ne(t.start,t.end,d,f),f=t.start}if(u.length&&c)c.dispose(),z(c.start,c.end),c=null;else if(!u.length&&i&&!c){let e=l(i);d.insertBefore(e.f,o),c=e}}))})}function J(e,t,n){y(()=>b(()=>t(n,e)))}function se(e,t,n,r){let i=e;_(()=>{let e=n();if(t===`checked`)i.checked=!!e;else{let t=e==null?``:String(e);i.value!==t&&(i.value=t)}});let a=t===`checked`||i.tagName===`SELECT`?`change`:`input`;i.addEventListener(a,()=>{let e=i.type===`number`||i.type===`range`;v(()=>r(t===`checked`?i.checked:e?i.valueAsNumber:i.value))})}var Y=new Set;function X(e,t){if(Y.has(e)||typeof document>`u`||(Y.add(e),document.head.querySelector(`style[data-futu="${e}"]`)))return;let n=document.createElement(`style`);n.dataset.futu=e,n.textContent=t,document.head.appendChild(n)}function ce(e){let t=document;t.startViewTransition?t.startViewTransition(()=>v(e)):v(e)}function le(e,t,n){let r=A(),i=A();t.appendChild(r);let a;return b(r=>{a=r,y(()=>e(n??{},t))}),t.appendChild(i),T(),()=>{a(),z(r,i)}}X(`f-4ub8cp`,`header.f-4ub8cp {
    position: sticky;
    top: 0;
    z-index: 20;
    background: color-mix(in srgb, var(--canvas) 82%, transparent);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--hairline);
  }
  .inner.f-4ub8cp {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    max-width: var(--page-max);
    height: var(--header);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }
  .brand.f-4ub8cp {
    display: flex;
    align-items: center;
    gap: 2px;
    font: 500 18px/1 var(--font-display);
    letter-spacing: -0.04em;
  }
  .brand b.f-4ub8cp {
    font-weight: 500;
    color: var(--red);
  }
  .mark.f-4ub8cp {
    width: 26px;
    height: 26px;
  }
  nav.f-4ub8cp {
    display: flex;
    gap: 28px;
  }
  nav a.f-4ub8cp, .cta.f-4ub8cp {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  nav a.f-4ub8cp {
    color: var(--muted);
    transition: color 0.2s;
  }
  nav a.f-4ub8cp:hover {
    color: var(--fg);
  }
  .cta.f-4ub8cp {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 14px;
    color: var(--canvas);
    background: var(--green);
  }
  @media (max-width: 860px) {
    nav.f-4ub8cp {
      display: none;
    }
  }`);function ue(e={},t){let n=[{href:`#why`,label:`Why`},{href:`#syntax`,label:`Syntax`},{href:`#use-cases`,label:`Use cases`},{href:`#playground`,label:`Playground`},{href:`#rendering`,label:`Rendering`}],r=L(t,`header`);r.setAttribute(`class`,`f-4ub8cp`);let i=L(r,`div`);i.setAttribute(`class`,`inner f-4ub8cp`);let a=L(i,`a`);a.setAttribute(`class`,`brand f-4ub8cp`),a.setAttribute(`href`,`#top`);let o=L(a,`img`);o.setAttribute(`class`,`mark f-4ub8cp`),o.setAttribute(`src`,`/rocket.svg`),o.setAttribute(`alt`,``);let s=L(a,`span`);s.setAttribute(`class`,`f-4ub8cp`),R(s,`Futu`);let c=L(s,`b`);c.setAttribute(`class`,`f-4ub8cp`),R(c,`script`);let l=L(i,`nav`);l.setAttribute(`class`,`f-4ub8cp`),l.setAttribute(`aria-label`,`Sections`),q(l,()=>n,e=>e.href,(e,t,n)=>{let r=L(e,`a`);r.setAttribute(`class`,`f-4ub8cp`),U(r,`href`,()=>t.get().href),V(r,()=>t.get().label)});let u=L(i,`a`);u.setAttribute(`class`,`cta f-4ub8cp`),u.setAttribute(`href`,`#start`),R(u,`Get started`)}var de=new Set([`import`,`from`,`export`,`const`,`let`,`function`,`return`,`await`,`async`,`of`,`by`,`new`,`if`]);function fe(e){let t=[],n=``,r=0,i=!0,a=!1,o=!1,s=(e,a)=>{a?(n&&t.push({t:n,k:``}),n=``,t.push({t:e,k:a})):n+=e,r+=e.length,i=!1};for(;r<e.length;){let t=e.slice(r),c,l=r===0||/\s/.test(e[r-1]);if((c=/^<!--[\s\S]*?-->/.exec(t))||!o&&(c=/^\/\/[^\n]*/.exec(t))||l&&(c=/^# [^\n]*/.exec(t)))s(c[0],`c`);else if(i&&(c=/^\(<\/?[A-Za-z]+>/.exec(t)))s(c[0],`i`),a=!0;else if(a&&(c=/^<\/[A-Za-z]+>\)/.exec(t)))s(c[0],`i`),a=!1;else if(a&&/^\)[ \t]*(\n|$)/.test(t))s(`)`,`i`),a=!1;else if(i&&(c=/^[MG]\d+\b/.exec(t)))s(c[0],`g`);else if(c=/^"[^"\n]*"|^'[^'\n]*'|^`[^`]*`/.exec(t))s(c[0],`s`);else if(c=/^=>/.exec(t))s(c[0],``);else if(!a&&(c=/^<\/?[A-Za-z][\w.]*/.exec(t)))s(c[0],`t`),o=!0;else if(o&&(c=/^\/?>/.exec(t)))s(c[0],`t`),o=!1;else if(c=/^[A-Za-z_$][\w$]*/.exec(t)){let e=c[0]===`of`||c[0]===`by`;de.has(c[0])&&(!e||a)?s(c[0],`k`):s(c[0],o&&t[c[0].length]===`=`?`a`:``)}else if(c=/^\d+(\.\d+)?(s|ms|px)?/.exec(t))s(c[0],`n`);else if(t[0]===`{`||t[0]===`}`)s(t[0],`p`);else{let e=t[0];n+=e,r+=1,e===`
`?i=!0:e!==` `&&e!==`	`&&(i=!1)}}return n&&t.push({t:n,k:``}),t}X(`f-lo31j1`,`figure.f-lo31j1 {
    margin: 0;
    min-width: 0;
    background: var(--surface);
    border: 1px solid var(--hairline);
  }
  figcaption.f-lo31j1 {
    display: flex;
    align-items: center;
    gap: 14px;
    height: 38px;
    padding: 0 14px;
    border-bottom: 1px solid var(--hairline);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--muted);
  }
  .dots.f-lo31j1 {
    display: flex;
    gap: 6px;
  }
  i.f-lo31j1 {
    width: 8px;
    height: 8px;
    background: var(--hairline-strong);
  }
  .file.f-lo31j1 {
    color: var(--fg-2);
  }
  .lang.f-lo31j1 {
    margin-left: auto;
    text-transform: uppercase;
    color: var(--faint);
  }
  pre.f-lo31j1 {
    margin: 0;
    padding: 18px 20px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.7;
    color: var(--fg-2);
    tab-size: 2;
  }
  code.f-lo31j1 {
    font: inherit;
  }`);function Z(e={},t){let n=g(()=>e.code),r=g(()=>e.file??``),i=g(()=>e.lang??`fs`),a=g(()=>fe(n.get())),o=L(t,`figure`);o.setAttribute(`class`,`f-lo31j1`),K(o,[()=>r.get()],[e=>{let t=L(e,`figcaption`);t.setAttribute(`class`,`f-lo31j1`);let n=L(t,`span`);n.setAttribute(`class`,`dots f-lo31j1`),n.setAttribute(`aria-hidden`,`true`),L(n,`i`).setAttribute(`class`,`f-lo31j1`),L(n,`i`).setAttribute(`class`,`f-lo31j1`),L(n,`i`).setAttribute(`class`,`f-lo31j1`);let a=L(t,`span`);a.setAttribute(`class`,`file f-lo31j1`),V(a,()=>r.get());let o=L(t,`span`);o.setAttribute(`class`,`lang f-lo31j1`),V(o,()=>i.get())}]),R(o,` `);let s=L(o,`pre`);s.setAttribute(`class`,`f-lo31j1`);let c=L(s,`code`);c.setAttribute(`class`,`f-lo31j1`),q(c,()=>a.get(),null,(e,t,n)=>{let r=L(e,`span`);W(r,()=>[t.get().k&&`tok-`+t.get().k],`f-lo31j1`),V(r,()=>t.get().t)})}var pe=`/assets/hero-Dzjsm01V.webp`,me=`(<extruderInitialization>)
  import Package from "./Package.fs"

  M98  crew: string = "Planet Express"
  M104 packages: Delivery[] = []
  M105 late = packages.filter((p) => p.late)
  M106 { M117 "Good news, everyone!" }
(</extruderInitialization>)

(<extrusion>)
  <h1>{crew} · {late.length} late</h1>

  (<each> p of packages by p.id )
    <Package {p} />
  (<empty>)
    <p>Nothing to deliver. Printer went for a beer.</p>
  (</each>)
(</extrusion>)

(<filament>)
  h1 { font-family: "Futura", sans-serif; }
(</filament>)`,he=`import { useState, useMemo, useEffect } from "react"

export function Beers() {
  const [beers, setBeers] = useState(0)
  const happy = useMemo(() => beers > 3, [beers])
  useEffect(() => console.debug(beers), [beers])

  return (
    <button onClick={() => setBeers(beers + 1)}>
      {happy ? "Printer is great!" : "Need more beer"}
    </button>
  )
}`,ge=`(<extruderInitialization>)
  M104 beers = 0
  M105 happy = beers > 3
  M106 { M117 beers }
(</extruderInitialization>)

(<extrusion>)
  <button onclick={() => beers++}>
    (<if> happy )
      Printer is great!
    (<else>)
      Need more beer
    (</if>)
  </button>
(</extrusion>)`,_e=[{mark:`( )`,title:`Parens are for the Slicer`,text:`Anything in ( … ) is a compiler instruction and vanishes at build time. A bare <div> lands on the page.`},{mark:`M104`,title:`Heat means reactivity`,text:`M10x sets temperatures on a printer. Here it declares state, derived values and effects. Hot reacts, cold stays static.`},{mark:`(<layer>)`,title:`One boundary for everything async`,text:`Suspense, error boundary, streaming chunk and lazy island in one block.`}],ve=[{name:`(<host>)`,what:`Server module`,runs:`on the server only`},{name:`(<extruderInitialization>)`,what:`Setup: TypeScript plus G-codes`,runs:`once per instance`},{name:`(<extrusion>)`,what:`Template`,runs:`on the server and the client`},{name:`(<filament>)`,what:`Scoped CSS`,runs:`at build time`}],ye=[{code:`M98`,printer:`Call a subprogram with parameters`,futu:`Prop, one per line`},{code:`M104`,printer:`Set hotend temperature`,futu:`State (a signal)`},{code:`M105`,printer:`Report temperature`,futu:`Derived value, lazy and cached`},{code:`M106`,printer:`Fan on`,futu:`Effect, may return a cleanup`},{code:`M107`,printer:`Fan off`,futu:`On destroy`},{code:`M141`,printer:`Set chamber temperature`,futu:`Provide context to the subtree`},{code:`M117`,printer:`Show a message on the display`,futu:`Dev-only log, stripped in production`},{code:`M600`,printer:`Filament change`,futu:`State update inside a View Transition`},{code:`M109`,printer:`Set temperature and wait`,futu:`Async derived, the component suspends`},{code:`G0`,printer:`Rapid move, no extrusion`,futu:`Client-side navigation`},{code:`G28`,printer:`Home all axes`,futu:`Redirect, works on the server too`}],be=[{id:`dashboard`,client:`Planet Express`,title:`A delivery dashboard`,text:`Live packages, crew and a dark matter gauge. Keyed rows reorder without losing their DOM.`,tags:[`signals`,`keyed lists`,`SPA`],code:`M104 packages: Delivery[] = []
M105 fuel = ship.darkMatter / ship.capacity

(<each> p of packages by p.id )
  <PackageRow {p} />
(</each>)`},{id:`content`,client:`Head Museum`,title:`A docs or content site`,text:`Thousands of pages that change once a century. Prerendered, zero JS, only the ticket form wakes up.`,tags:[`SSG`,`islands`,`zero JS`],code:`(<procedureDone> export </procedureDone>)

(<layer> heat="visible" )
  <TicketForm />
(</layer>)`},{id:`store`,client:`MomCorp`,title:`An online store`,text:`The catalogue comes from the cache. The cart and "Mom recommends" stream in after.`,tags:[`PPR`,`server islands`,`streaming`],code:`(<procedureDone> export shell </procedureDone>)

(<layer> host )
  <CartBadge />
(<pending>)
  <CartSkeleton />
(</layer>)`},{id:`forms`,client:`Central Bureaucracy`,title:`Forms and back office`,text:`(<host>) never reaches the browser. Forms work before JS loads, secrets stay in the building, filed in triplicate.`,tags:[`server functions`,`progressive forms`],code:`(<host>)
  export const file = action(async (form: FormData) => {
    await db.forms.create({ grade: 36, stamp: "approved" })
  })
(</host>)

<form action={file}> … </form>`},{id:`media`,client:`Everybody Loves Hypnotoad`,title:`Pages with slow, flaky data`,text:`Slow reviews sit in a (<layer>) with a fallback. If the service dies, only that layer shows it.`,tags:[`suspense`,`error boundary`],code:`(<layer>)
  <Reviews episode={id} />
(<pending>)
  <p>All glory to the loading spinner…</p>
(<catch> err )
  <p>Spaghetti: {err.message}</p>
(</layer>)`},{id:`lab`,client:`The Professor's lab`,title:`Tiny components and prototypes`,text:`A file with no blocks is just HTML. Scoped CSS and Vite included.`,tags:[`template-only files`,`scoped CSS`,`Vite`],code:`<!-- Beer.fs -->
<p class="hint">Done. Go grab a beer.</p>`}],Q=[{id:`spa`,label:`SPA`,nick:`The Planet Express Ship`,quote:`The ship stays where it is, and the engines move the universe around it.`,who:`Professor Farnsworth`,pragma:`(<procedureDone> spa </procedureDone>)`,text:`One bundle, runs in the browser, navigates without reloads.`},{id:`ssr`,label:`Streaming SSR`,nick:`Calculon's dramatic pause`,quote:``,who:``,pragma:`// nothing to write, it's the default for routes`,text:`HTML streams layer by layer. Fast parts first, slow (<layer>) blocks make their entrance… later.`},{id:`ssg`,label:`SSG`,nick:`Applied Cryogenics`,quote:``,who:``,pragma:`(<procedureDone> export </procedureDone>)`,text:`Frozen at build time, like Fry on December 31, 1999. Thaws per request, not per millennium.`},{id:`isr`,label:`ISR`,nick:`Slurm refill`,quote:`It's highly addictive!`,who:`Slurm`,pragma:`(<procedureDone> export every 60s </procedureDone>)`,text:`Static, refreshed in the background. A fresh can every 60 seconds.`},{id:`ppr`,label:`PPR`,nick:`Printer's spool window`,quote:``,who:``,pragma:`(<procedureDone> export shell </procedureDone>)`,text:`The body comes from the cache. What spins in the chest window is personal and streams in.`},{id:`islands`,label:`Islands`,nick:`Nibbler`,quote:``,who:``,pragma:`(<layer> heat="visible" )`,text:`Mostly cold HTML that sleeps all day. Interactive parts wake on load, idle, visible or interaction.`},{id:`resume`,label:`Resumability`,nick:`The forward-only time machine`,quote:``,who:``,pragma:`(<procedureDone> resume </procedureDone>)`,text:`No hydration. Like the Professor's time machine, it only goes forward.`}],xe=[{phase:`0`,name:`Prototype`,text:`Parser, signals, client rendering, this site.`},{phase:`1`,name:`Tooling`,text:`Editor support, type checking, formatter.`},{phase:`2`,name:`Server`,text:`Streaming SSR, hydration, server functions.`},{phase:`3`,name:`Meta-framework`,text:`Router, SSG, ISR, deploy.`},{phase:`4`,name:`Granular hydration`,text:`Islands, server islands, PPR.`},{phase:`5`,name:`Experiments`,text:`Resumability, devtools.`}];X(`f-ebtvcn`,`.hero.f-ebtvcn {
    position: relative;
    border-bottom: 1px solid var(--hairline);
    background-image:
      linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
    background-size: 24px 24px;
    background-position: center top;
  }
  .hero.f-ebtvcn::after {
    content: "";
    position: absolute;
    inset: auto 0 -1px;
    height: 6px;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      transparent 0 24px,
      var(--green) 24px 30px,
      transparent 30px calc(100% - 30px),
      var(--green) calc(100% - 30px) calc(100% - 24px),
      transparent calc(100% - 24px)
    );
  }
  .inner.f-ebtvcn {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 64px;
    max-width: var(--page-max);
    margin-inline: auto;
    padding: 96px var(--gutter) 88px;
    border-inline: 1px dashed var(--hairline);
  }
  .copy.f-ebtvcn {
    min-width: 0;
  }
  h1.f-ebtvcn {
    font: 550 clamp(2.2rem, 3.7vw, 3.5rem)/1.1 var(--font-display);
    letter-spacing: -0.055em;
    text-wrap: balance;
  }
  h1 span.f-ebtvcn {
    display: block;
    margin-top: 6px;
    color: var(--green);
  }
  .lead.f-ebtvcn {
    max-width: 500px;
    margin: 28px 0 36px;
    font-size: 18px;
    line-height: 1.7;
    color: var(--fg-2);
  }
  .actions.f-ebtvcn {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 28px;
  }
  .sample.f-ebtvcn {
    position: relative;
    min-width: 0;
    box-shadow: 10px 10px 0 rgb(0 0 0 / 0.45);
  }
  .mascot.f-ebtvcn {
    position: absolute;
    right: calc(100% + 20px);
    bottom: -88px;
    height: 230px;
    width: auto;
    pointer-events: none;
    user-select: none;
    filter: drop-shadow(0 12px 16px rgb(0 0 0 / 0.45));
  }
  .facts.f-ebtvcn {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    max-width: var(--page-max);
    margin: 0 auto;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--hairline);
    border-inline: 1px dashed var(--hairline);
  }
  li.f-ebtvcn {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 28px var(--gutter) 32px;
    border-left: 1px dashed var(--hairline);
  }
  li.f-ebtvcn:first-child {
    border-left: 0;
  }
  strong.f-ebtvcn {
    font: 500 28px/1 var(--font-display);
    letter-spacing: -0.04em;
    color: var(--fg);
  }
  li span.f-ebtvcn {
    max-width: 220px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--muted);
  }
  @media (max-width: 1000px) {
    .inner.f-ebtvcn {
      grid-template-columns: minmax(0, 1fr);
      gap: 190px;
      padding-top: 72px;
    }
    .mascot.f-ebtvcn {
      right: 24px;
      bottom: 100%;
      height: 170px;
      margin-bottom: -4px;
    }
    .facts.f-ebtvcn {
      grid-template-columns: repeat(2, 1fr);
    }
    li.f-ebtvcn:nth-child(3) {
      border-left: 0;
    }
    li.f-ebtvcn:nth-child(n + 3) {
      border-top: 1px dashed var(--hairline);
    }
  }`);function Se(e={},t){let n=[{value:`0`,label:`virtual DOM nodes`},{value:`Rust`,label:`compiler, built on Oxc`},{value:`4`,label:`optional blocks per file`},{value:`1`,label:`boundary for all async`}],r=L(t,`section`);r.setAttribute(`class`,`hero f-ebtvcn`),r.setAttribute(`id`,`top`);let i=L(r,`div`);i.setAttribute(`class`,`inner f-ebtvcn`);let a=L(i,`div`);a.setAttribute(`class`,`copy f-ebtvcn`);let o=L(a,`p`);o.setAttribute(`class`,`eyebrow f-ebtvcn`);let s=L(o,`b`);s.setAttribute(`class`,`f-ebtvcn`),R(s,`v0`),R(o,` Ready for the year 3000`);let c=L(a,`h1`);c.setAttribute(`class`,`f-ebtvcn`),R(c,`Good news, everyone! `);let l=L(c,`span`);l.setAttribute(`class`,`f-ebtvcn`),R(l,`Web pages are printed now.`);let u=L(a,`p`);u.setAttribute(`class`,`lead f-ebtvcn`),R(u,`A compiled UI framework with signals, a Rust compiler and no virtual DOM. The syntax comes from Futurama, the API is deliberately boring.`);let d=L(a,`div`);d.setAttribute(`class`,`actions f-ebtvcn`);let f=L(d,`a`);f.setAttribute(`class`,`btn green f-ebtvcn`),f.setAttribute(`href`,`#start`),R(f,`Get started `);let p=L(f,`span`);p.setAttribute(`class`,`f-ebtvcn`),R(p,`→`);let m=L(d,`a`);m.setAttribute(`class`,`link f-ebtvcn`),m.setAttribute(`href`,`#syntax`),R(m,`Read the syntax `);let h=L(m,`span`);h.setAttribute(`class`,`f-ebtvcn`),R(h,`↓`);let g=L(i,`div`);g.setAttribute(`class`,`sample f-ebtvcn`);let _=L(g,`img`);_.setAttribute(`class`,`mascot flip f-ebtvcn`),U(_,`src`,()=>pe),_.setAttribute(`alt`,`Printer Printer Escuella, the Futuscript robot, holding a freshly printed page`),J(g,Z,{get code(){return me},file:`DeliveryList.fs`});let v=L(r,`ul`);v.setAttribute(`class`,`facts f-ebtvcn`),q(v,()=>n,e=>e.value,(e,t,n)=>{let r=L(e,`li`);r.setAttribute(`class`,`f-ebtvcn`);let i=L(r,`strong`);i.setAttribute(`class`,`f-ebtvcn`),V(i,()=>t.get().value);let a=L(r,`span`);a.setAttribute(`class`,`f-ebtvcn`),V(a,()=>t.get().label)})}var Ce=`/assets/why-DvLtOS5x.webp`;X(`f-yj4cg3`,`.principles.f-yj4cg3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0 0 88px;
    padding: 0;
    list-style: none;
  }
  li.f-yj4cg3 {
    padding: 4px 36px 0;
    border-left: 1px dashed var(--hairline);
  }
  li.f-yj4cg3:first-child {
    padding-left: 0;
    border-left: 0;
  }
  .mark.f-yj4cg3 {
    display: inline-block;
    margin-bottom: 22px;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--green);
    background: var(--green-tint);
    border: 1px solid rgb(79 214 138 / 0.3);
  }
  h3.f-yj4cg3 {
    margin-bottom: 10px;
    font: 500 1.1rem/1.3 var(--font-display);
    letter-spacing: -0.035em;
  }
  li p.f-yj4cg3 {
    max-width: 340px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  .compare.f-yj4cg3 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .side.f-yj4cg3 {
    min-width: 0;
  }
  .label.f-yj4cg3 {
    margin-bottom: 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .label b.f-yj4cg3 {
    font-weight: 400;
    color: var(--green);
  }
  .caption.f-yj4cg3 {
    margin-top: 20px;
    font-size: 15px;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .principles.f-yj4cg3 {
      grid-template-columns: minmax(0, 1fr);
      margin-bottom: 56px;
    }
    li.f-yj4cg3, li.f-yj4cg3:first-child {
      padding: 24px 0;
      border-left: 0;
      border-top: 1px dashed var(--hairline);
    }
    .compare.f-yj4cg3 {
      grid-template-columns: minmax(0, 1fr);
    }
  }`);function we(e={},t){let n=L(t,`section`);n.setAttribute(`class`,`section f-yj4cg3`),n.setAttribute(`id`,`why`);let r=L(n,`div`);r.setAttribute(`class`,`wrap f-yj4cg3`);let i=L(r,`p`);i.setAttribute(`class`,`eyebrow f-yj4cg3`),R(i,`Why`);let a=L(r,`div`);a.setAttribute(`class`,`head f-yj4cg3`);let o=L(a,`h2`);o.setAttribute(`class`,`title f-yj4cg3`),R(o,`The joke is in the structure. `);let s=L(o,`span`);s.setAttribute(`class`,`f-yj4cg3`),R(s,`The API stays boring.`);let c=L(a,`p`);c.setAttribute(`class`,`intro f-yj4cg3`),R(c,`It reads like G-code, but underneath it's signals and plain TypeScript. Why another framework? Printer Printer Escuella put it best: we'll build our own, with blackjack and G-codes.`);let l=L(a,`img`);l.setAttribute(`class`,`robot f-yj4cg3`),U(l,`src`,()=>Ce),l.setAttribute(`alt`,``);let u=L(r,`ol`);u.setAttribute(`class`,`principles f-yj4cg3`),q(u,()=>_e,e=>e.title,(e,t,n)=>{let r=L(e,`li`);r.setAttribute(`class`,`f-yj4cg3`);let i=L(r,`code`);i.setAttribute(`class`,`mark f-yj4cg3`),V(i,()=>t.get().mark);let a=L(r,`h3`);a.setAttribute(`class`,`f-yj4cg3`),V(a,()=>t.get().title);let o=L(r,`p`);o.setAttribute(`class`,`f-yj4cg3`),V(o,()=>t.get().text)});let d=L(r,`div`);d.setAttribute(`class`,`compare f-yj4cg3`);let f=L(d,`div`);f.setAttribute(`class`,`side f-yj4cg3`);let p=L(f,`p`);p.setAttribute(`class`,`label f-yj4cg3`),R(p,`React`),J(f,Z,{get code(){return he},file:`Beers.tsx`,lang:`tsx`});let m=L(d,`div`);m.setAttribute(`class`,`side f-yj4cg3`);let h=L(m,`p`);h.setAttribute(`class`,`label f-yj4cg3`);let g=L(h,`b`);g.setAttribute(`class`,`f-yj4cg3`),R(g,`Futuscript`),J(m,Z,{get code(){return ge},file:`Beers.fs`});let _=L(r,`p`);_.setAttribute(`class`,`caption f-yj4cg3`),R(_,`Same component. No setters, no dependency arrays. Dependency arrays do not work that way. Good night!`)}var Te=`/assets/syntax-CvTh7WwJ.webp`;X(`f-cwk6it`,`.sub.f-cwk6it {
    margin: 0 0 18px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .blocks.f-cwk6it {
    margin: 0 0 72px;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--hairline);
  }
  .blocks li.f-cwk6it {
    display: grid;
    grid-template-columns: minmax(0, 330px) 1fr;
    align-items: center;
    gap: 24px;
    padding: 18px 0;
    border-bottom: 1px solid var(--hairline);
  }
  .blocks code.f-cwk6it {
    font-size: 14px;
    color: var(--green);
    overflow-wrap: anywhere;
  }
  .what.f-cwk6it {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .what strong.f-cwk6it {
    font-weight: 500;
  }
  .what span.f-cwk6it {
    font-size: 14px;
    color: var(--muted);
  }
  .table.f-cwk6it {
    overflow-x: auto;
    border: 1px solid var(--hairline);
  }
  table.f-cwk6it {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
    font-size: 14px;
  }
  th.f-cwk6it {
    padding: 12px 16px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-align: left;
    color: var(--muted);
    background: var(--surface);
    border-bottom: 1px solid var(--hairline);
  }
  td.f-cwk6it {
    padding: 12px 16px;
    vertical-align: middle;
    border-bottom: 1px solid var(--hairline);
  }
  tbody tr:last-child td.f-cwk6it {
    border-bottom: 0;
  }
  tbody tr:hover td.f-cwk6it {
    background: var(--tint, rgb(255 255 255 / 0.025));
  }
  .code.f-cwk6it {
    font-size: 14px;
    font-weight: 700;
    color: var(--orange);
  }
  .printer.f-cwk6it {
    color: var(--muted);
  }
  .note.f-cwk6it {
    margin-top: 20px;
    max-width: 620px;
    font-size: 15px;
    color: var(--muted);
  }
  @media (max-width: 760px) {
    .blocks li.f-cwk6it {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }
    .blocks .chip.f-cwk6it {
      justify-self: start;
    }
  }`);function Ee(e={},t){let n=L(t,`section`);n.setAttribute(`class`,`section f-cwk6it`),n.setAttribute(`id`,`syntax`);let r=L(n,`div`);r.setAttribute(`class`,`wrap f-cwk6it`);let i=L(r,`p`);i.setAttribute(`class`,`eyebrow f-cwk6it`),R(i,`Syntax`);let a=L(r,`div`);a.setAttribute(`class`,`head robot-left f-cwk6it`);let o=L(a,`h2`);o.setAttribute(`class`,`title f-cwk6it`),R(o,`Four blocks and a few printer codes. `);let s=L(o,`span`);s.setAttribute(`class`,`f-cwk6it`),R(s,`That's the whole language.`);let c=L(a,`p`);c.setAttribute(`class`,`intro f-cwk6it`),R(c,`Every block is optional. The codes do roughly what they do on a real printer: the M10x temperature family is the reactivity family.`);let l=L(a,`img`);l.setAttribute(`class`,`robot flip f-cwk6it`),U(l,`src`,()=>Te),l.setAttribute(`alt`,``);let u=L(r,`h3`);u.setAttribute(`class`,`sub f-cwk6it`),R(u,`Anatomy of a .fs file`);let d=L(r,`ul`);d.setAttribute(`class`,`blocks f-cwk6it`),q(d,()=>ve,e=>e.name,(e,t,n)=>{let r=L(e,`li`);r.setAttribute(`class`,`f-cwk6it`);let i=L(r,`code`);i.setAttribute(`class`,`f-cwk6it`),V(i,()=>t.get().name);let a=L(r,`div`);a.setAttribute(`class`,`what f-cwk6it`);let o=L(a,`strong`);o.setAttribute(`class`,`f-cwk6it`),V(o,()=>t.get().what);let s=L(a,`span`);s.setAttribute(`class`,`f-cwk6it`),R(s,`Runs `),V(s,()=>t.get().runs),R(s,`.`)});let f=L(r,`h3`);f.setAttribute(`class`,`sub f-cwk6it`),R(f,`G-code cheat sheet`);let p=L(r,`div`);p.setAttribute(`class`,`table f-cwk6it`);let m=L(p,`table`);m.setAttribute(`class`,`f-cwk6it`);let h=L(m,`thead`);h.setAttribute(`class`,`f-cwk6it`);let g=L(h,`tr`);g.setAttribute(`class`,`f-cwk6it`);let _=L(g,`th`);_.setAttribute(`class`,`f-cwk6it`),R(_,`Code`);let v=L(g,`th`);v.setAttribute(`class`,`f-cwk6it`),R(v,`On a real printer`);let y=L(g,`th`);y.setAttribute(`class`,`f-cwk6it`),R(y,`In Futuscript`);let b=L(m,`tbody`);b.setAttribute(`class`,`f-cwk6it`),q(b,()=>ye,e=>e.code,(e,t,n)=>{let r=L(e,`tr`);r.setAttribute(`class`,`f-cwk6it`);let i=L(r,`td`);i.setAttribute(`class`,`f-cwk6it`);let a=L(i,`code`);a.setAttribute(`class`,`code f-cwk6it`),V(a,()=>t.get().code);let o=L(r,`td`);o.setAttribute(`class`,`printer f-cwk6it`),V(o,()=>t.get().printer);let s=L(r,`td`);s.setAttribute(`class`,`f-cwk6it`),V(s,()=>t.get().futu)});let x=L(r,`p`);x.setAttribute(`class`,`note f-cwk6it`),R(x,`No need to memorise them: type state, the editor writes M104.`)}var De=`/assets/usecases-CvPZHJ8H.webp`;X(`f-5g9l8i`,`.grid.f-5g9l8i {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--hairline);
  }
  article.f-5g9l8i {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 40px 40px 44px 0;
    border-bottom: 1px solid var(--hairline);
  }
  article.f-5g9l8i:nth-child(even) {
    padding: 40px 0 44px 40px;
    border-left: 1px dashed var(--hairline);
  }
  .client.f-5g9l8i {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--green);
  }
  h3.f-5g9l8i {
    font: 500 1.3rem/1.3 var(--font-display);
    letter-spacing: -0.04em;
  }
  .text.f-5g9l8i {
    max-width: 520px;
    margin-bottom: 6px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  .meta.f-5g9l8i {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
    padding-top: 6px;
  }
  @media (max-width: 900px) {
    .grid.f-5g9l8i {
      grid-template-columns: minmax(0, 1fr);
    }
    article.f-5g9l8i, article.f-5g9l8i:nth-child(even) {
      padding: 32px 0;
      border-left: 0;
    }
  }`);function Oe(e={},t){let n=L(t,`section`);n.setAttribute(`class`,`section f-5g9l8i`),n.setAttribute(`id`,`use-cases`);let r=L(n,`div`);r.setAttribute(`class`,`wrap f-5g9l8i`);let i=L(r,`p`);i.setAttribute(`class`,`eyebrow f-5g9l8i`),R(i,`Use cases`);let a=L(r,`div`);a.setAttribute(`class`,`head f-5g9l8i`);let o=L(a,`h2`);o.setAttribute(`class`,`title f-5g9l8i`),R(o,`Real jobs. `);let s=L(o,`span`);s.setAttribute(`class`,`f-5g9l8i`),R(s,`Fictional clients.`);let c=L(a,`p`);c.setAttribute(`class`,`intro f-5g9l8i`),R(c,`Six jobs from the Planet Express logbook and how each maps onto Futuscript.`);let l=L(a,`img`);l.setAttribute(`class`,`robot f-5g9l8i`),U(l,`src`,()=>De),l.setAttribute(`alt`,``);let u=L(r,`div`);u.setAttribute(`class`,`grid f-5g9l8i`),q(u,()=>be,e=>e.id,(e,t,n)=>{let r=L(e,`article`);r.setAttribute(`class`,`f-5g9l8i`);let i=L(r,`p`);i.setAttribute(`class`,`client f-5g9l8i`),V(i,()=>t.get().client);let a=L(r,`h3`);a.setAttribute(`class`,`f-5g9l8i`),V(a,()=>t.get().title);let o=L(r,`p`);o.setAttribute(`class`,`text f-5g9l8i`),V(o,()=>t.get().text),J(r,Z,{get code(){return t.get().code}});let s=L(r,`div`);s.setAttribute(`class`,`meta f-5g9l8i`),q(s,()=>t.get().tags,e=>e,(e,t,n)=>{let r=L(e,`span`);r.setAttribute(`class`,`chip f-5g9l8i`),V(r,()=>t.get())})})}var ke=`/assets/playground-CADvfjOC.webp`;X(`f-am6jjf`,`label.f-am6jjf {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
  }
  strong.f-am6jjf {
    font-weight: 400;
    color: var(--fg);
  }
  input.f-am6jjf {
    width: 100%;
    accent-color: var(--orange);
  }
  .thermo.f-am6jjf {
    height: 6px;
    margin: 16px 0 20px;
    background: linear-gradient(90deg, var(--cyan), var(--green) 40%, var(--orange) 70%, var(--pink));
    clip-path: inset(0 calc(100% - var(--t)) 0 0);
  }
  p.f-am6jjf {
    font-size: 17px;
    color: var(--cyan);
  }
  .ok.f-am6jjf {
    color: var(--green);
  }
  .hot.f-am6jjf {
    color: var(--pink);
  }`);function Ae(e={},t){let n=h(190),r=g(()=>n.get()<200?`cold`:n.get()<=240?`ok`:`spaghetti`),i=L(t,`label`);i.setAttribute(`class`,`f-am6jjf`),R(i,`Nozzle `);let a=L(i,`strong`);a.setAttribute(`class`,`f-am6jjf`),V(a,()=>n.get()),R(a,` °C`);let o=L(t,`input`);o.setAttribute(`class`,`f-am6jjf`),o.setAttribute(`type`,`range`),o.setAttribute(`min`,`150`),o.setAttribute(`max`,`280`),se(o,`value`,()=>n.get(),e=>{n.set(e)});let s=L(t,`div`);W(s,()=>[`thermo`,r.get()],`f-am6jjf`),ae(s,()=>`--t: ${(n.get()-150)/1.3}%`),K(t,[()=>r.get()===`cold`,()=>r.get()===`ok`],[e=>{let t=L(e,`p`);t.setAttribute(`class`,`f-am6jjf`),R(t,`Too cold. The filament won't budge.`)},e=>{let t=L(e,`p`);t.setAttribute(`class`,`ok f-am6jjf`),R(t,`Just right. We're printing!`)},e=>{let t=L(e,`p`);t.setAttribute(`class`,`hot f-am6jjf`),R(t,`Way too hot. Spaghetti is pouring out of the nozzle.`)}])}var je=`(<extruderInitialization>)
  M104 temp = 190
  M105 state = temp < 200 ? "cold" : temp <= 240 ? "ok" : "spaghetti"
(</extruderInitialization>)

(<extrusion>)
  <label>Nozzle <strong>{temp} °C</strong></label>
  <input type="range" min="150" max="280" bind:value={temp} />
  <div class={["thermo", state]} style={\`--t: \${(temp - 150) / 1.3}%\`}></div>

  (<if> state === "cold" )
    <p>Too cold. The filament won't budge.</p>
  (<elseif> state === "ok" )
    <p class="ok">Just right. We're printing!</p>
  (<else>)
    <p class="hot">Way too hot. Spaghetti is pouring out of the nozzle.</p>
  (</if>)
(</extrusion>)

(<filament>)
  label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
  }
  strong {
    font-weight: 400;
    color: var(--fg);
  }
  input {
    width: 100%;
    accent-color: var(--orange);
  }
  .thermo {
    height: 6px;
    margin: 16px 0 20px;
    background: linear-gradient(90deg, var(--cyan), var(--green) 40%, var(--orange) 70%, var(--pink));
    clip-path: inset(0 calc(100% - var(--t)) 0 0);
  }
  p {
    font-size: 17px;
    color: var(--cyan);
  }
  .ok {
    color: var(--green);
  }
  .hot {
    color: var(--pink);
  }
(</filament>)
`;X(`f-1x7bwd`,`.split.f-1x7bwd {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    align-items: start;
    gap: 24px;
  }
  .source.f-1x7bwd {
    min-width: 0;
    max-height: 560px;
    overflow-y: auto;
    border-bottom: 1px solid var(--hairline);
  }
  .side.f-1x7bwd {
    position: sticky;
    top: calc(var(--header) + 24px);
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .stand.f-1x7bwd {
    align-self: flex-start;
    height: 200px;
    width: auto;
    margin-left: 12px;
    pointer-events: none;
    user-select: none;
    filter: drop-shadow(0 14px 18px rgb(0 0 0 / 0.5));
  }
  .live.f-1x7bwd {
    padding: 28px;
    background: var(--surface);
    border: 1px solid var(--hairline);
    box-shadow: inset 0 3px 0 var(--orange);
  }
  .tag.f-1x7bwd {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--orange);
  }
  i.f-1x7bwd {
    width: 6px;
    height: 6px;
    background: var(--orange);
  }
  @media (max-width: 900px) {
    .split.f-1x7bwd {
      grid-template-columns: minmax(0, 1fr);
    }
  }`);function Me(e={},t){let n=L(t,`section`);n.setAttribute(`class`,`section f-1x7bwd`),n.setAttribute(`id`,`playground`);let r=L(n,`div`);r.setAttribute(`class`,`wrap f-1x7bwd`);let i=L(r,`p`);i.setAttribute(`class`,`eyebrow f-1x7bwd`),R(i,`Playground`);let a=L(r,`div`);a.setAttribute(`class`,`head f-1x7bwd`);let o=L(a,`h2`);o.setAttribute(`class`,`title f-1x7bwd`),R(o,`This is not a screenshot. `);let s=L(o,`span`);s.setAttribute(`class`,`f-1x7bwd`),R(s,`It's printing right now.`);let c=L(a,`p`);c.setAttribute(`class`,`intro f-1x7bwd`),R(c,`The real Nozzle.fs on the left, rendering live on the right. Try overheating it. Printer would.`);let l=L(r,`div`);l.setAttribute(`class`,`split f-1x7bwd`);let u=L(l,`div`);u.setAttribute(`class`,`source f-1x7bwd`),J(u,Z,{get code(){return je.trim()},file:`site/src/components/Nozzle.fs`});let d=L(l,`div`);d.setAttribute(`class`,`side f-1x7bwd`);let f=L(d,`div`);f.setAttribute(`class`,`live f-1x7bwd`);let p=L(f,`p`);p.setAttribute(`class`,`tag f-1x7bwd`),L(p,`i`).setAttribute(`class`,`f-1x7bwd`),R(p,` Live`),J(f,Ae,{});let m=L(d,`img`);m.setAttribute(`class`,`stand f-1x7bwd`),U(m,`src`,()=>ke),m.setAttribute(`alt`,``)}var $=`/assets/rendering-PJsYJLbQ.webp`;X(`f-agfr11`,`.split.f-agfr11 {
    display: grid;
    grid-template-columns: 280px 1fr;
    border: 1px solid var(--hairline);
  }
  .tabs.f-agfr11 {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--hairline);
  }
  button.f-agfr11 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    font-family: var(--font-mono);
    font-size: 13px;
    text-align: left;
    color: var(--muted);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--hairline);
    cursor: pointer;
    transition: color 0.2s, background-color 0.2s;
  }
  button.f-agfr11:last-child {
    border-bottom: 0;
  }
  button.f-agfr11:hover {
    color: var(--fg);
    background: rgb(255 255 255 / 0.025);
  }
  .active.f-agfr11 {
    color: var(--fg);
    background: var(--surface);
    box-shadow: inset 3px 0 0 var(--green);
  }
  .panel.f-agfr11 {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    min-width: 0;
    padding: 36px 40px 40px;
    background: var(--surface);
    view-transition-name: mode-panel;
  }
  .pragma.f-agfr11 {
    align-self: stretch;
  }
  .mono.f-agfr11 {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--green);
  }
  h3.f-agfr11 {
    font: 500 clamp(1.4rem, 2.4vw, 1.9rem)/1.2 var(--font-display);
    letter-spacing: -0.045em;
  }
  blockquote.f-agfr11 {
    margin: 0;
    padding-left: 16px;
    border-left: 2px solid var(--green);
    font-size: 17px;
    color: var(--fg);
  }
  cite.f-agfr11 {
    display: block;
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-style: normal;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .text.f-agfr11 {
    max-width: 600px;
    font-size: 16px;
    line-height: 1.7;
    color: var(--fg-2);
  }
  @media (max-width: 860px) {
    .split.f-agfr11 {
      grid-template-columns: minmax(0, 1fr);
    }
    .tabs.f-agfr11 {
      flex-direction: row;
      flex-wrap: wrap;
      border-right: 0;
      border-bottom: 1px solid var(--hairline);
    }
    button.f-agfr11, button.f-agfr11:last-child {
      border: 0;
      padding: 10px 14px;
    }
    .active.f-agfr11 {
      box-shadow: inset 0 -2px 0 var(--green);
    }
    .panel.f-agfr11 {
      padding: 28px 24px;
    }
  }`);function Ne(e={},t){let n=h(`spa`),r=g(()=>Q.find(e=>e.id===n.get())??Q[0]);function i(e){ce(()=>{n.set(e)})}let a=L(t,`section`);a.setAttribute(`class`,`section f-agfr11`),a.setAttribute(`id`,`rendering`);let o=L(a,`div`);o.setAttribute(`class`,`wrap f-agfr11`);let s=L(o,`p`);s.setAttribute(`class`,`eyebrow f-agfr11`),R(s,`Rendering`);let c=L(o,`div`);c.setAttribute(`class`,`head robot-left f-agfr11`);let l=L(c,`h2`);l.setAttribute(`class`,`title f-agfr11`),R(l,`One pragma per page. `);let u=L(l,`span`);u.setAttribute(`class`,`f-agfr11`),R(u,`Every rendering mode.`);let d=L(c,`p`);d.setAttribute(`class`,`intro f-agfr11`),R(d,`The mode is one line in the setup. Every mode mixes three axes: when HTML is printed, how it's delivered, when JavaScript heats up.`);let f=L(c,`img`);f.setAttribute(`class`,`robot flip f-agfr11`),U(f,`src`,()=>$),f.setAttribute(`alt`,``);let p=L(o,`div`);p.setAttribute(`class`,`split f-agfr11`);let m=L(p,`div`);m.setAttribute(`class`,`tabs f-agfr11`),m.setAttribute(`role`,`tablist`),q(m,()=>Q,e=>e.id,(e,t,r)=>{let a=L(e,`button`);W(a,()=>({active:t.get().id===n.get()}),`f-agfr11`),a.setAttribute(`role`,`tab`),U(a,`aria-selected`,()=>t.get().id===n.get()),G(a,`click`,()=>(()=>i(t.get().id))),V(a,()=>t.get().label)});let _=L(p,`div`);_.setAttribute(`class`,`panel f-agfr11`),_.setAttribute(`role`,`tabpanel`);let v=L(_,`p`);v.setAttribute(`class`,`mono f-agfr11`),V(v,()=>r.get().label);let y=L(_,`h3`);y.setAttribute(`class`,`f-agfr11`),V(y,()=>r.get().nick),K(_,[()=>r.get().quote],[e=>{let t=L(e,`blockquote`);t.setAttribute(`class`,`f-agfr11`),R(t,`“`),V(t,()=>r.get().quote),R(t,`” `);let n=L(t,`cite`);n.setAttribute(`class`,`f-agfr11`),V(n,()=>r.get().who)}]),R(_,` `);let b=L(_,`p`);b.setAttribute(`class`,`text f-agfr11`),V(b,()=>r.get().text);let x=L(_,`div`);x.setAttribute(`class`,`pragma f-agfr11`),J(x,Z,{get code(){return r.get().pragma}})}var Pe=`/assets/errors-DUVu3Wp2.webp`;X(`f-gk9bau`,`.split.f-gk9bau {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 24px;
    align-items: stretch;
  }
  .term.f-gk9bau {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--surface);
    border: 1px solid var(--hairline);
    transition: border-color 0.2s;
  }
  .broken.f-gk9bau {
    border-color: var(--pink);
  }
  .bar.f-gk9bau {
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--hairline);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .state.f-gk9bau {
    color: var(--green);
  }
  .broken .state.f-gk9bau {
    color: var(--pink);
  }
  pre.f-gk9bau {
    margin: 0;
    padding: 16px 20px;
    font-size: 13px;
    line-height: 1.7;
    overflow-x: auto;
  }
  .code.f-gk9bau {
    color: var(--fg);
    border-bottom: 1px dashed var(--hairline);
  }
  .ln.f-gk9bau {
    color: var(--faint);
  }
  .out.f-gk9bau {
    flex: 1;
    color: var(--green);
  }
  .err.f-gk9bau {
    color: var(--pink);
  }
  .actions.f-gk9bau {
    padding: 0 20px 20px;
  }
  aside.f-gk9bau {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    padding: 32px;
    border: 1px dashed var(--hairline-strong);
  }
  .mono.f-gk9bau {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--green);
  }
  h3.f-gk9bau {
    font: 500 1.3rem/1.3 var(--font-display);
    letter-spacing: -0.04em;
  }
  aside p.f-gk9bau:last-child {
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .split.f-gk9bau {
      grid-template-columns: minmax(0, 1fr);
    }
  }`);function Fe(e={},t){let n=h(!1),r=g(()=>n.get()?`M14 count = 0`:`M104 count = 0`);function i(){n.set(!n.get())}let a=L(t,`section`);a.setAttribute(`class`,`section f-gk9bau`),a.setAttribute(`id`,`errors`);let o=L(a,`div`);o.setAttribute(`class`,`wrap f-gk9bau`);let s=L(o,`p`);s.setAttribute(`class`,`eyebrow f-gk9bau`),R(s,`Errors`);let c=L(o,`div`);c.setAttribute(`class`,`head f-gk9bau`);let l=L(c,`h2`);l.setAttribute(`class`,`title f-gk9bau`),R(l,`A failed print is spaghetti. `);let u=L(l,`span`);u.setAttribute(`class`,`f-gk9bau`),R(u,`Not a stack trace from Robot Hell.`);let d=L(c,`p`);d.setAttribute(`class`,`intro f-gk9bau`),R(d,`A failed 3D print is a tangle of plastic noodles, hence the name. The joke stops at the title: you get the file, the line and the fix.`);let f=L(c,`img`);f.setAttribute(`class`,`robot f-gk9bau`),U(f,`src`,()=>Pe),f.setAttribute(`alt`,``);let p=L(o,`div`);p.setAttribute(`class`,`split f-gk9bau`);let m=L(p,`div`);W(m,()=>[`term`,n.get()&&`broken`],`f-gk9bau`);let _=L(m,`div`);_.setAttribute(`class`,`bar f-gk9bau`);let v=L(_,`span`);v.setAttribute(`class`,`f-gk9bau`),R(v,`futu dev`);let y=L(_,`span`);y.setAttribute(`class`,`state f-gk9bau`),V(y,()=>n.get()?`1 error`:`ok`);let b=L(m,`pre`);b.setAttribute(`class`,`code f-gk9bau`);let x=L(b,`span`);x.setAttribute(`class`,`ln f-gk9bau`),R(x,`2`),R(b,` `),V(b,()=>r.get()),K(m,[()=>n.get()],[e=>{let t=L(e,`pre`);t.setAttribute(`class`,`out err f-gk9bau`),V(t,()=>`Spaghetti in Counter.fs:2:3

 2 │   M14 count = 0
   │   ^^^ unknown G-code

help: did you mean M104 (state)?`)},e=>{let t=L(e,`pre`);t.setAttribute(`class`,`out f-gk9bau`),R(t,`✓ printed in 3 ms · 0 errors · Printer says: neat.`)}]),R(m,` `);let S=L(m,`div`);S.setAttribute(`class`,`actions f-gk9bau`);let C=L(S,`button`);C.setAttribute(`class`,`btn f-gk9bau`),G(C,`click`,()=>i),V(C,()=>n.get()?`Let Printer fix it`:`Break it`);let w=L(p,`aside`);w.setAttribute(`class`,`f-gk9bau`);let T=L(w,`p`);T.setAttribute(`class`,`mono f-gk9bau`),R(T,`At runtime`);let E=L(w,`h3`);E.setAttribute(`class`,`f-gk9bau`),R(E,`Our crew is replaceable. Your page isn't.`);let D=L(w,`p`);D.setAttribute(`class`,`f-gk9bau`),R(D,`When a component throws, the nearest `);let O=L(D,`code`);O.setAttribute(`class`,`f-gk9bau`),V(O,()=>`(<layer>)`),R(D,` prints its fallback. The rest keeps running.`)}var Ie=`/assets/start-BGby3Ozk.webp`;X(`f-ti31g6`,`.split.f-ti31g6 {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    align-items: start;
    gap: 48px;
  }
  .roadmap.f-ti31g6 {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--hairline);
  }
  li.f-ti31g6 {
    display: grid;
    grid-template-columns: 80px 1fr;
    align-items: start;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid var(--hairline);
  }
  .phase.f-ti31g6 {
    padding-top: 2px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--faint);
  }
  strong.f-ti31g6 {
    font-weight: 500;
  }
  li p.f-ti31g6 {
    margin-top: 2px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .split.f-ti31g6 {
      grid-template-columns: minmax(0, 1fr);
    }
    li.f-ti31g6 {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
    }
  }`);function Le(e={},t){let n=L(t,`section`);n.setAttribute(`class`,`section f-ti31g6`),n.setAttribute(`id`,`start`);let r=L(n,`div`);r.setAttribute(`class`,`wrap f-ti31g6`);let i=L(r,`p`);i.setAttribute(`class`,`eyebrow f-ti31g6`),R(i,`Get started`);let a=L(r,`div`);a.setAttribute(`class`,`head robot-left f-ti31g6`);let o=L(a,`h2`);o.setAttribute(`class`,`title f-ti31g6`),R(o,`Shut up and take my money! `);let s=L(o,`span`);s.setAttribute(`class`,`f-ti31g6`),R(s,`Relax, it's free. Clone it.`);let c=L(a,`p`);c.setAttribute(`class`,`intro f-ti31g6`),R(c,`Phase 0: compiler, signals and client rendering work, and this site runs on them. Server rendering is next.`);let l=L(a,`img`);l.setAttribute(`class`,`robot flip f-ti31g6`),U(l,`src`,()=>Ie),l.setAttribute(`alt`,``);let u=L(r,`div`);u.setAttribute(`class`,`split f-ti31g6`),J(u,Z,{get code(){return`# needs Node 24+, pnpm and stable Rust
pnpm install
pnpm dev     # builds the Slicer, opens the playground
pnpm test    # compiler tests in Rust + vitest end to end

# or run the compiler by itself
cargo run -q -- examples/Counter.fs`},file:`terminal`,lang:`sh`});let d=L(u,`ol`);d.setAttribute(`class`,`roadmap f-ti31g6`),q(d,()=>xe,e=>e.phase,(e,t,n)=>{let r=L(e,`li`);r.setAttribute(`class`,`f-ti31g6`);let i=L(r,`span`);i.setAttribute(`class`,`phase f-ti31g6`),R(i,`Phase `),V(i,()=>t.get().phase);let a=L(r,`div`);a.setAttribute(`class`,`f-ti31g6`);let o=L(a,`strong`);o.setAttribute(`class`,`f-ti31g6`),V(o,()=>t.get().name);let s=L(a,`p`);s.setAttribute(`class`,`f-ti31g6`),V(s,()=>t.get().text)})}var Re=`/assets/footer-rnF4UZzZ.webp`;X(`f-hh564c`,`footer.f-hh564c {
    max-width: var(--page-max);
    margin: 0 auto;
    border-inline: 1px dashed var(--hairline);
  }
  .inner.f-hh564c {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 48px 72px;
    padding: 72px var(--gutter) 56px;
  }
  .sleeper.f-hh564c {
    align-self: end;
    height: 130px;
    width: auto;
    margin-bottom: -57px;
    pointer-events: none;
    user-select: none;
  }
  .word.f-hh564c {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
    font: 500 22px/1 var(--font-display);
    letter-spacing: -0.04em;
  }
  .word b.f-hh564c {
    font-weight: 500;
    color: var(--red);
  }
  .word img.f-hh564c {
    width: 30px;
    height: 30px;
    margin-right: 2px;
  }
  .brand p.f-hh564c:last-child {
    max-width: 420px;
    font-size: 15px;
    color: var(--muted);
  }
  .links.f-hh564c {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 10px 48px;
    align-content: start;
  }
  a.f-hh564c {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    transition: color 0.2s;
  }
  a.f-hh564c:hover {
    color: var(--fg);
  }
  .base.f-hh564c {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px 32px;
    padding: 20px var(--gutter) 28px;
    border-top: 1px solid var(--hairline);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--faint);
  }
  @media (max-width: 760px) {
    .inner.f-hh564c {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .brand.f-hh564c {
      grid-column: 1 / -1;
    }
    .sleeper.f-hh564c {
      height: 96px;
    }
  }`);function ze(e={},t){let n=L(t,`footer`);n.setAttribute(`class`,`f-hh564c`);let r=L(n,`div`);r.setAttribute(`class`,`inner f-hh564c`);let i=L(r,`div`);i.setAttribute(`class`,`brand f-hh564c`);let a=L(i,`p`);a.setAttribute(`class`,`word f-hh564c`);let o=L(a,`img`);o.setAttribute(`class`,`f-hh564c`),o.setAttribute(`src`,`/rocket.svg`),o.setAttribute(`alt`,``),R(a,`Futu`);let s=L(a,`b`);s.setAttribute(`class`,`f-hh564c`),R(s,`script`);let c=L(i,`p`);c.setAttribute(`class`,`f-hh564c`),R(c,`Every section of this page is a .fs file. Printer slept through the build.`);let l=L(r,`div`);l.setAttribute(`class`,`links f-hh564c`);let u=L(l,`a`);u.setAttribute(`class`,`f-hh564c`),u.setAttribute(`href`,`#why`),R(u,`Why`);let d=L(l,`a`);d.setAttribute(`class`,`f-hh564c`),d.setAttribute(`href`,`#syntax`),R(d,`Syntax`);let f=L(l,`a`);f.setAttribute(`class`,`f-hh564c`),f.setAttribute(`href`,`#use-cases`),R(f,`Use cases`);let p=L(l,`a`);p.setAttribute(`class`,`f-hh564c`),p.setAttribute(`href`,`#playground`),R(p,`Playground`);let m=L(l,`a`);m.setAttribute(`class`,`f-hh564c`),m.setAttribute(`href`,`#rendering`),R(m,`Rendering`);let h=L(l,`a`);h.setAttribute(`class`,`f-hh564c`),h.setAttribute(`href`,`#start`),R(h,`Get started`);let g=L(r,`img`);g.setAttribute(`class`,`sleeper f-hh564c`),U(g,`src`,()=>Re),g.setAttribute(`alt`,``);let _=L(n,`div`);_.setAttribute(`class`,`base f-hh564c`);let v=L(_,`span`);v.setAttribute(`class`,`f-hh564c`),R(v,`Printed in New New York, year 3000`);let y=L(_,`span`);y.setAttribute(`class`,`f-hh564c`),R(y,`A fan-made joke framework. Futurama belongs to its creators, we just borrowed the printer.`)}function Be(e={},t){let n=L(t,`main`);J(n,ue,{}),J(n,Se,{}),J(n,we,{}),J(n,Ee,{}),J(n,Oe,{}),J(n,Me,{}),J(n,Ne,{}),J(n,Fe,{}),J(n,Le,{}),J(n,ze,{})}le(Be,document.getElementById(`plate`));