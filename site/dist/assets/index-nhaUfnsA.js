(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=0,t=1,n=2,r=class{value;fn;isEffect;state;sources=[];observers=new Set;owner;children=null;cleanups=null;disposed=!1;constructor(t,r,i){this.value=t,this.fn=r,this.isEffect=i,this.state=r?n:e,this.owner=r?a:null,r&&a&&(a.children??=[]).push(this)}get(){return i&&!i.disposed&&!i.sources.includes(this)&&(i.sources.push(this),this.observers.add(i)),this.fn&&u(this),this.value}set(e){if(this.fn)throw Error(`computed hodnota se nedá přepsat`);if(Object.is(this.value,e))return e;this.value=e;for(let e of this.observers)l(e,n);return o||m(),e}notify(){for(let e of this.observers)l(e,n);o||m()}},i=null,a=null,o=0,s=!1,c=[];function l(n,r){if(n.state>=r)return;let i=n.state===e;if(n.state=r,i){if(n.isEffect)c.push(n);else for(let e of n.observers)l(e,t)}}function u(r){if(r.state===t){for(let e of r.sources)if(e.fn&&u(e),r.state===n)break}r.state===n&&d(r),r.state=e}function d(e){f(e);let t=i,r=a;i=e,a=e;try{let t=e.fn();if(e.isEffect)typeof t==`function`&&(e.cleanups??=[]).push(t);else if(!Object.is(t,e.value)){e.value=t;for(let t of e.observers)t.state=n}}finally{i=t,a=r}}function f(e){if(e.children){let t=e.children;e.children=null;for(let e of t)p(e)}if(e.cleanups){let t=e.cleanups;e.cleanups=null;for(let e of t)e()}if(e instanceof r){for(let t of e.sources)t.observers.delete(e);e.sources=[]}}function p(e){if(e.disposed)return;e.disposed=!0;let t=e.owner?.children;if(t){let n=t.indexOf(e);n>=0&&t.splice(n,1)}f(e)}function m(){if(!s){s=!0;try{for(let e=0;e<c.length;e++){let t=c[e];t.disposed||u(t)}}finally{c.length=0,s=!1}}}function h(e,t,n){let r=e.get();return e.set(r+t),n?r:r+t}function g(e){return new r(e,null,!1)}function _(e){return new r(void 0,e,!1)}function v(t){let n=new r(void 0,t,!0);return d(n),n.state=e,()=>p(n)}function y(e){o++;try{return e()}finally{--o===0&&m()}}function b(e){let t=i;i=null;try{return e()}finally{i=t}}function x(e){let t={owner:a,children:null,cleanups:null,disposed:!1};a&&(a.children??=[]).push(t);let n=a,r=i;a=t,i=null;try{return e(()=>p(t))}finally{a=n,i=r}}function S(e){a&&(a.cleanups??=[]).push(e)}function C(){return a}function w(e,t){let n=a,r=i;a=e,i=null;try{return t()}finally{a=n,i=r}}var T=[],E=!1;function D(e){T.push({owner:a,fn:e}),E||(E=!0,queueMicrotask(O))}function O(){E=!1;let e=T.splice(0);for(let{owner:t,fn:n}of e)t?.disposed||w(t,()=>v(n))}var k=Symbol.for(`futuscript.renderable`),A=e=>typeof e==`object`&&!!e&&k in e;function j(e){return e?typeof e==`string`?e:Array.isArray(e)?e.map(j).filter(Boolean).join(` `):typeof e==`object`?Object.entries(e).filter(([,e])=>e).map(([e])=>e).join(` `):String(e):``}function M(e){return e==null||e===!1?null:typeof e==`object`?Object.entries(e).filter(([,e])=>e!=null&&e!==!1).map(([e,t])=>`${e.startsWith(`--`)?e:e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`)}:${t}`).join(`;`):String(e)}var N=e=>e==null||typeof e==`boolean`?``:String(e);g(0);var P=()=>document.createDocumentFragment(),F=()=>document.createComment(``),I=new WeakMap;function L(e){return I.has(e)?I.get(e):e.firstChild}function R(e,t){console.warn(`hydratace: čekal jsem ${e}, našel jsem`,t)}function z(e){let t=L(e);if(t?.nodeType===8)return I.set(e,t.nextSibling),t;R(`<!---->`,t);let n=F();return e.insertBefore(n,t),n}function ee(e,t){let n=L(e);if(t&&n?.nodeType===3){let r=n;return r.data.length>t.length&&r.splitText(t.length),r.data!==t&&R(JSON.stringify(t),r),I.set(e,r.nextSibling),r}t&&R(JSON.stringify(t),n);let r=document.createTextNode(t);return e.insertBefore(r,n),r}function B(e){let t=F();return e.appendChild(t),t}function V(e,t){let n=document.createElement(t);return e.appendChild(n),n}function H(e,t){let n=document.createElementNS(`http://www.w3.org/2000/svg`,t);return e.appendChild(n),n}function U(e,t){e.appendChild(document.createTextNode(t))}function W(e,t){let n=e;for(;n;){let e=n.nextSibling;if(n.parentNode?.removeChild(n),n===t)break;n=e}}function te(e,t){let n=e.nextSibling;for(;n&&n!==t;){let e=n.nextSibling;n.parentNode.removeChild(n),n=e}}function ne(e,t,n,r){let i=e;for(;i;){let e=i.nextSibling;if(n.insertBefore(i,r),i===t)break;i=e}}function G(e,t){let n=e.appendChild(document.createTextNode(``)),r=null;v(()=>{let i=t();if(A(i)){b(()=>{if(!n)r=z(e),x(()=>i[k](e)),n=ee(e,``);else{n.data&&(n.data=``),r||(r=F(),n.parentNode.insertBefore(r,n));let e=P();x(()=>i[k](e)),n.parentNode.insertBefore(e,n)}let t=r,a=n;S(()=>te(t,a))});return}let a=N(i);n?n.data!==a&&(n.data=a):n=ee(e,a)})}var re=new WeakSet;function K(e,t,n){v(()=>{let r=n();if(t===`action`&&typeof r==`function`&&r.url)return ie(e,r);ae(e,t,r)})}function ie(e,t){e.setAttribute(`action`,t.url),e.setAttribute(`method`,`post`),e.__futuAction=t,re.has(e)||(re.add(e),e.addEventListener(`submit`,t=>{t.preventDefault();let n=e.__futuAction;n(new FormData(e)).then(()=>e.reset())}))}function ae(e,t,n){n==null||n===!1?e.removeAttribute(t):e.setAttribute(t,n===!0?``:String(n))}function oe(e,t){v(()=>se(e,t()))}function se(e,t){let n=M(t);n==null?e.removeAttribute(`style`):e.setAttribute(`style`,n)}function q(e,t,n){v(()=>{let r=j([t(),n]);e.setAttribute(`class`,r)})}function ce(e,t,n){let r=t=>{let r=b(n);typeof r==`function`&&y(()=>r.call(e,t))};e.addEventListener(t,r),e instanceof Element||S(()=>e.removeEventListener(t,r))}function J(e,t,n){let r=B(e),i=B(e),a=_(()=>{for(let e=0;e<t.length;e++)if(t[e]())return e;return t.length});v(()=>{let t=n[a.get()];b(()=>{if(!i)t&&x(()=>t(e)),i=z(e);else if(t){let e=P();x(()=>t(e)),i.parentNode.insertBefore(e,i)}let n=i;t&&S(()=>te(r,n))})})}function Y(e,t,n,r,i){let a=C(),o=B(e),s=new Map,c=null,l=t=>{if(!o){let n=z(e),r=w(a,()=>x(n=>(t(e),n)));return{start:n,end:z(e),dispose:r,f:null}}let n=F(),r=F(),i=P();i.appendChild(n);let s=w(a,()=>x(e=>(t(i),e)));return i.appendChild(r),{start:n,end:r,dispose:s,f:i}};v(()=>{let a=Array.from(t()??[]);b(()=>y(()=>{let t=new Map,u=[];a.forEach((e,i)=>{let a=n?n(e,i):i;t.has(a)&&(console.warn(`(<each>): klíč ${String(a)} je tu dvakrát, položky se můžou splést`),a=Symbol());let o=s.get(a);if(o)s.delete(a),o.item.set(e),o.index.set(i);else{let t=g(e),n=g(i),a=l(e=>r(e,t,n));o={start:a.start,end:a.end,item:t,index:n,dispose:a.dispose}}t.set(a,o),u.push(o)});for(let e of s.values())e.dispose(),W(e.start,e.end);if(s=t,!o){!u.length&&i&&(c=l(i)),o=z(e);return}let d=o.parentNode,f=o;for(let e=u.length-1;e>=0;e--){let t=u[e];t.end.nextSibling!==f&&ne(t.start,t.end,d,f),f=t.start}if(u.length&&c)c.dispose(),W(c.start,c.end),c=null;else if(!u.length&&i&&!c){let e=l(i);d.insertBefore(e.f,o),c=e}}))})}function X(e,t,n){b(()=>x(()=>t(n,e)))}function le(e,t,n,r){let i=e;v(()=>{let e=n();if(t===`checked`)i.checked=!!e;else{let t=e==null?``:String(e);i.value!==t&&(i.value=t)}});let a=t===`checked`||i.tagName===`SELECT`?`change`:`input`;i.addEventListener(a,()=>{let e=i.type===`number`||i.type===`range`;y(()=>r(t===`checked`?i.checked:e?i.valueAsNumber:i.value))})}var ue=new Set;function Z(e,t){if(ue.has(e)||typeof document>`u`||(ue.add(e),document.head.querySelector(`style[data-futu="${e}"]`)))return;let n=document.createElement(`style`);n.dataset.futu=e,n.textContent=t,document.head.appendChild(n)}function de(e){let t=document;t.startViewTransition?t.startViewTransition(()=>y(e)):y(e)}function fe(e,t,n){let r=F(),i=F();t.appendChild(r);let a;return x(r=>{a=r,b(()=>e(n??{},t))}),t.appendChild(i),O(),()=>{a(),W(r,i)}}Z(`f-4ub8cp`,`header.f-4ub8cp {
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
  }`);function pe(e={},t){let n=[{href:`#why`,label:`Why`},{href:`#syntax`,label:`Syntax`},{href:`#use-cases`,label:`Use cases`},{href:`#playground`,label:`Playground`},{href:`#rendering`,label:`Rendering`}],r=V(t,`header`);r.setAttribute(`class`,`f-4ub8cp`);let i=V(r,`div`);i.setAttribute(`class`,`inner f-4ub8cp`);let a=V(i,`a`);a.setAttribute(`class`,`brand f-4ub8cp`),a.setAttribute(`href`,`#top`);let o=V(a,`img`);o.setAttribute(`class`,`mark f-4ub8cp`),o.setAttribute(`src`,`/rocket.svg`),o.setAttribute(`alt`,``);let s=V(a,`span`);s.setAttribute(`class`,`f-4ub8cp`),U(s,`Futu`);let c=V(s,`b`);c.setAttribute(`class`,`f-4ub8cp`),U(c,`script`);let l=V(i,`nav`);l.setAttribute(`class`,`f-4ub8cp`),l.setAttribute(`aria-label`,`Sections`),Y(l,()=>n,e=>e.href,(e,t,n)=>{let r=V(e,`a`);r.setAttribute(`class`,`f-4ub8cp`),K(r,`href`,()=>t.get().href),G(r,()=>t.get().label)});let u=V(i,`a`);u.setAttribute(`class`,`cta f-4ub8cp`),u.setAttribute(`href`,`#start`),U(u,`Get started`)}var me=new Set([`import`,`from`,`export`,`const`,`let`,`function`,`return`,`await`,`async`,`of`,`by`,`new`,`if`]);function he(e){let t=[],n=``,r=0,i=!0,a=!1,o=!1,s=(e,a)=>{a?(n&&t.push({t:n,k:``}),n=``,t.push({t:e,k:a})):n+=e,r+=e.length,i=!1};for(;r<e.length;){let t=e.slice(r),c,l=r===0||/\s/.test(e[r-1]);if((c=/^<!--[\s\S]*?-->/.exec(t))||!o&&(c=/^\/\/[^\n]*/.exec(t))||l&&(c=/^# [^\n]*/.exec(t)))s(c[0],`c`);else if(i&&(c=/^\(<\/?[A-Za-z]+>/.exec(t)))s(c[0],`i`),a=!0;else if(a&&(c=/^<\/[A-Za-z]+>\)/.exec(t)))s(c[0],`i`),a=!1;else if(a&&/^\)[ \t]*(\n|$)/.test(t))s(`)`,`i`),a=!1;else if(i&&(c=/^[MG]\d+\b/.exec(t)))s(c[0],`g`);else if(c=/^"[^"\n]*"|^'[^'\n]*'|^`[^`]*`/.exec(t))s(c[0],`s`);else if(c=/^=>/.exec(t))s(c[0],``);else if(!a&&(c=/^<\/?[A-Za-z][\w.]*/.exec(t)))s(c[0],`t`),o=!0;else if(o&&(c=/^\/?>/.exec(t)))s(c[0],`t`),o=!1;else if(c=/^[A-Za-z_$][\w$]*/.exec(t)){let e=c[0]===`of`||c[0]===`by`;me.has(c[0])&&(!e||a)?s(c[0],`k`):s(c[0],o&&t[c[0].length]===`=`?`a`:``)}else if(c=/^\d+(\.\d+)?(s|ms|px)?/.exec(t))s(c[0],`n`);else if(t[0]===`{`||t[0]===`}`)s(t[0],`p`);else{let e=t[0];n+=e,r+=1,e===`
`?i=!0:e!==` `&&e!==`	`&&(i=!1)}}return n&&t.push({t:n,k:``}),t}Z(`f-lo31j1`,`figure.f-lo31j1 {
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
  }`);function Q(e={},t){let n=_(()=>e.code),r=_(()=>e.file??``),i=_(()=>e.lang??`fs`),a=_(()=>he(n.get())),o=V(t,`figure`);o.setAttribute(`class`,`f-lo31j1`),J(o,[()=>r.get()],[e=>{let t=V(e,`figcaption`);t.setAttribute(`class`,`f-lo31j1`);let n=V(t,`span`);n.setAttribute(`class`,`dots f-lo31j1`),n.setAttribute(`aria-hidden`,`true`),V(n,`i`).setAttribute(`class`,`f-lo31j1`),V(n,`i`).setAttribute(`class`,`f-lo31j1`),V(n,`i`).setAttribute(`class`,`f-lo31j1`);let a=V(t,`span`);a.setAttribute(`class`,`file f-lo31j1`),G(a,()=>r.get());let o=V(t,`span`);o.setAttribute(`class`,`lang f-lo31j1`),G(o,()=>i.get())}]),U(o,` `);let s=V(o,`pre`);s.setAttribute(`class`,`f-lo31j1`);let c=V(s,`code`);c.setAttribute(`class`,`f-lo31j1`),Y(c,()=>a.get(),null,(e,t,n)=>{let r=V(e,`span`);q(r,()=>[t.get().k&&`tok-`+t.get().k],`f-lo31j1`),G(r,()=>t.get().t)})}var ge=`/assets/hero-C6Ary9Tp.webp`,_e=`(<extruderInitialization>)
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
(</filament>)`,ve=`import { useState, useMemo, useEffect } from "react"

export function Beers() {
  const [beers, setBeers] = useState(0)
  const happy = useMemo(() => beers > 3, [beers])
  useEffect(() => console.debug(beers), [beers])

  return (
    <button onClick={() => setBeers(beers + 1)}>
      {happy ? "Printer is great!" : "Need more beer"}
    </button>
  )
}`,ye=`(<extruderInitialization>)
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
(</extrusion>)`,be=[{mark:`( )`,title:`Parens are for the Slicer`,text:`Anything in ( … ) is a compiler instruction and vanishes at build time. A bare <div> lands on the page.`},{mark:`M104`,title:`Heat means reactivity`,text:`M10x sets temperatures on a printer. Here it declares state, derived values and effects. Hot reacts, cold stays static.`},{mark:`(<layer>)`,title:`One boundary for everything async`,text:`Suspense, error boundary, streaming chunk and lazy island in one block.`}],xe=[{name:`(<host>)`,what:`Server module`,runs:`on the server only`},{name:`(<extruderInitialization>)`,what:`Setup: TypeScript plus G-codes`,runs:`once per instance`},{name:`(<extrusion>)`,what:`Template`,runs:`on the server and the client`},{name:`(<filament>)`,what:`Scoped CSS`,runs:`at build time`}],Se=[{code:`M98`,printer:`Call a subprogram with parameters`,futu:`Prop, one per line`},{code:`M104`,printer:`Set hotend temperature`,futu:`State (a signal)`},{code:`M105`,printer:`Report temperature`,futu:`Derived value, lazy and cached`},{code:`M106`,printer:`Fan on`,futu:`Effect, may return a cleanup`},{code:`M107`,printer:`Fan off`,futu:`On destroy`},{code:`M141`,printer:`Set chamber temperature`,futu:`Provide context to the subtree`},{code:`M117`,printer:`Show a message on the display`,futu:`Dev-only log, stripped in production`},{code:`M600`,printer:`Filament change`,futu:`State update inside a View Transition`},{code:`M109`,printer:`Set temperature and wait`,futu:`Async derived, the component suspends`},{code:`G0`,printer:`Rapid move, no extrusion`,futu:`Client-side navigation`},{code:`G28`,printer:`Home all axes`,futu:`Redirect, works on the server too`}],Ce=[{id:`dashboard`,client:`Planet Express`,title:`A delivery dashboard`,text:`Live packages, crew and a dark matter gauge. Keyed rows reorder without losing their DOM.`,tags:[`signals`,`keyed lists`,`SPA`],code:`M104 packages: Delivery[] = []
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
<p class="hint">Done. Go grab a beer.</p>`}],$=[{id:`spa`,label:`SPA`,nick:`The Planet Express Ship`,quote:`The ship stays where it is, and the engines move the universe around it.`,who:`Professor Farnsworth`,pragma:`(<procedureDone> spa </procedureDone>)`,text:`One bundle, runs in the browser, navigates without reloads.`},{id:`ssr`,label:`Streaming SSR`,nick:`Calculon's dramatic pause`,quote:``,who:``,pragma:`// nothing to write, it's the default for routes`,text:`HTML streams layer by layer. Fast parts first, slow (<layer>) blocks make their entrance… later.`},{id:`ssg`,label:`SSG`,nick:`Applied Cryogenics`,quote:``,who:``,pragma:`(<procedureDone> export </procedureDone>)`,text:`Frozen at build time, like Fry on December 31, 1999. Thaws per request, not per millennium.`},{id:`isr`,label:`ISR`,nick:`Slurm refill`,quote:`It's highly addictive!`,who:`Slurm`,pragma:`(<procedureDone> export every 60s </procedureDone>)`,text:`Static, refreshed in the background. A fresh can every 60 seconds.`},{id:`ppr`,label:`PPR`,nick:`Printer's spool window`,quote:``,who:``,pragma:`(<procedureDone> export shell </procedureDone>)`,text:`The body comes from the cache. What spins in the chest window is personal and streams in.`},{id:`islands`,label:`Islands`,nick:`Nibbler`,quote:``,who:``,pragma:`(<layer> heat="visible" )`,text:`Mostly cold HTML that sleeps all day. Interactive parts wake on load, idle, visible or interaction.`},{id:`resume`,label:`Resumability`,nick:`The forward-only time machine`,quote:``,who:``,pragma:`(<procedureDone> resume </procedureDone>)`,text:`No hydration. Like the Professor's time machine, it only goes forward.`}];Z(`f-ebtvcn`,`.hero.f-ebtvcn {
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
  }`);function we(e={},t){let n=[{value:`0`,label:`virtual DOM nodes`},{value:`Rust`,label:`compiler, built on Oxc`},{value:`4`,label:`optional blocks per file`},{value:`1`,label:`boundary for all async`}],r=V(t,`section`);r.setAttribute(`class`,`hero f-ebtvcn`),r.setAttribute(`id`,`top`);let i=V(r,`div`);i.setAttribute(`class`,`inner f-ebtvcn`);let a=V(i,`div`);a.setAttribute(`class`,`copy f-ebtvcn`);let o=V(a,`p`);o.setAttribute(`class`,`eyebrow f-ebtvcn`);let s=V(o,`b`);s.setAttribute(`class`,`f-ebtvcn`),U(s,`v0`),U(o,` Ready for the year 3000`);let c=V(a,`h1`);c.setAttribute(`class`,`f-ebtvcn`),U(c,`Good news, everyone! `);let l=V(c,`span`);l.setAttribute(`class`,`f-ebtvcn`),U(l,`Web pages are printed now.`);let u=V(a,`p`);u.setAttribute(`class`,`lead f-ebtvcn`),U(u,`A compiled UI framework with signals, a Rust compiler and no virtual DOM. The syntax comes from Futurama, the API is deliberately boring.`);let d=V(a,`div`);d.setAttribute(`class`,`actions f-ebtvcn`);let f=V(d,`a`);f.setAttribute(`class`,`btn green f-ebtvcn`),f.setAttribute(`href`,`#start`),U(f,`Get started `);let p=V(f,`span`);p.setAttribute(`class`,`f-ebtvcn`),U(p,`→`);let m=V(d,`a`);m.setAttribute(`class`,`link f-ebtvcn`),m.setAttribute(`href`,`#syntax`),U(m,`Read the syntax `);let h=V(m,`span`);h.setAttribute(`class`,`f-ebtvcn`),U(h,`↓`);let g=V(i,`div`);g.setAttribute(`class`,`sample f-ebtvcn`);let _=V(g,`img`);_.setAttribute(`class`,`mascot flip f-ebtvcn`),K(_,`src`,()=>ge),_.setAttribute(`alt`,`Printer Printer Escuella, the Futuscript robot, holding a freshly printed page`),X(g,Q,{get code(){return _e},file:`DeliveryList.fs`});let v=V(r,`ul`);v.setAttribute(`class`,`facts f-ebtvcn`),Y(v,()=>n,e=>e.value,(e,t,n)=>{let r=V(e,`li`);r.setAttribute(`class`,`f-ebtvcn`);let i=V(r,`strong`);i.setAttribute(`class`,`f-ebtvcn`),G(i,()=>t.get().value);let a=V(r,`span`);a.setAttribute(`class`,`f-ebtvcn`),G(a,()=>t.get().label)})}var Te=`/assets/why-DZui69kP.webp`;Z(`f-yj4cg3`,`.principles.f-yj4cg3 {
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
  }`);function Ee(e={},t){let n=V(t,`section`);n.setAttribute(`class`,`section f-yj4cg3`),n.setAttribute(`id`,`why`);let r=V(n,`div`);r.setAttribute(`class`,`wrap f-yj4cg3`);let i=V(r,`p`);i.setAttribute(`class`,`eyebrow f-yj4cg3`),U(i,`Why`);let a=V(r,`div`);a.setAttribute(`class`,`head f-yj4cg3`);let o=V(a,`h2`);o.setAttribute(`class`,`title f-yj4cg3`),U(o,`The joke is in the structure. `);let s=V(o,`span`);s.setAttribute(`class`,`f-yj4cg3`),U(s,`The API stays boring.`);let c=V(a,`p`);c.setAttribute(`class`,`intro f-yj4cg3`),U(c,`It reads like G-code, but underneath it's signals and plain TypeScript. Why another framework? Printer Printer Escuella put it best: we'll build our own, with blackjack and G-codes.`);let l=V(a,`img`);l.setAttribute(`class`,`robot f-yj4cg3`),K(l,`src`,()=>Te),l.setAttribute(`alt`,``);let u=V(r,`ol`);u.setAttribute(`class`,`principles f-yj4cg3`),Y(u,()=>be,e=>e.title,(e,t,n)=>{let r=V(e,`li`);r.setAttribute(`class`,`f-yj4cg3`);let i=V(r,`code`);i.setAttribute(`class`,`mark f-yj4cg3`),G(i,()=>t.get().mark);let a=V(r,`h3`);a.setAttribute(`class`,`f-yj4cg3`),G(a,()=>t.get().title);let o=V(r,`p`);o.setAttribute(`class`,`f-yj4cg3`),G(o,()=>t.get().text)});let d=V(r,`div`);d.setAttribute(`class`,`compare f-yj4cg3`);let f=V(d,`div`);f.setAttribute(`class`,`side f-yj4cg3`);let p=V(f,`p`);p.setAttribute(`class`,`label f-yj4cg3`),U(p,`React`),X(f,Q,{get code(){return ve},file:`Beers.tsx`,lang:`tsx`});let m=V(d,`div`);m.setAttribute(`class`,`side f-yj4cg3`);let h=V(m,`p`);h.setAttribute(`class`,`label f-yj4cg3`);let g=V(h,`b`);g.setAttribute(`class`,`f-yj4cg3`),U(g,`Futuscript`),X(m,Q,{get code(){return ye},file:`Beers.fs`});let _=V(r,`p`);_.setAttribute(`class`,`caption f-yj4cg3`),U(_,`Same component. No setters, no dependency arrays. Dependency arrays do not work that way. Good night!`)}var De=`/assets/syntax-0K3jo83Q.webp`;Z(`f-cwk6it`,`.sub.f-cwk6it {
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
  }`);function Oe(e={},t){let n=V(t,`section`);n.setAttribute(`class`,`section f-cwk6it`),n.setAttribute(`id`,`syntax`);let r=V(n,`div`);r.setAttribute(`class`,`wrap f-cwk6it`);let i=V(r,`p`);i.setAttribute(`class`,`eyebrow f-cwk6it`),U(i,`Syntax`);let a=V(r,`div`);a.setAttribute(`class`,`head f-cwk6it`);let o=V(a,`h2`);o.setAttribute(`class`,`title f-cwk6it`),U(o,`Four blocks and a few printer codes. `);let s=V(o,`span`);s.setAttribute(`class`,`f-cwk6it`),U(s,`That's the whole language.`);let c=V(a,`p`);c.setAttribute(`class`,`intro f-cwk6it`),U(c,`Every block is optional. The codes do roughly what they do on a real printer: the M10x temperature family is the reactivity family.`);let l=V(a,`img`);l.setAttribute(`class`,`robot f-cwk6it`),K(l,`src`,()=>De),l.setAttribute(`alt`,``);let u=V(r,`h3`);u.setAttribute(`class`,`sub f-cwk6it`),U(u,`Anatomy of a .fs file`);let d=V(r,`ul`);d.setAttribute(`class`,`blocks f-cwk6it`),Y(d,()=>xe,e=>e.name,(e,t,n)=>{let r=V(e,`li`);r.setAttribute(`class`,`f-cwk6it`);let i=V(r,`code`);i.setAttribute(`class`,`f-cwk6it`),G(i,()=>t.get().name);let a=V(r,`div`);a.setAttribute(`class`,`what f-cwk6it`);let o=V(a,`strong`);o.setAttribute(`class`,`f-cwk6it`),G(o,()=>t.get().what);let s=V(a,`span`);s.setAttribute(`class`,`f-cwk6it`),U(s,`Runs `),G(s,()=>t.get().runs),U(s,`.`)});let f=V(r,`h3`);f.setAttribute(`class`,`sub f-cwk6it`),U(f,`G-code cheat sheet`);let p=V(r,`div`);p.setAttribute(`class`,`table f-cwk6it`);let m=V(p,`table`);m.setAttribute(`class`,`f-cwk6it`);let h=V(m,`thead`);h.setAttribute(`class`,`f-cwk6it`);let g=V(h,`tr`);g.setAttribute(`class`,`f-cwk6it`);let _=V(g,`th`);_.setAttribute(`class`,`f-cwk6it`),U(_,`Code`);let v=V(g,`th`);v.setAttribute(`class`,`f-cwk6it`),U(v,`On a real printer`);let y=V(g,`th`);y.setAttribute(`class`,`f-cwk6it`),U(y,`In Futuscript`);let b=V(m,`tbody`);b.setAttribute(`class`,`f-cwk6it`),Y(b,()=>Se,e=>e.code,(e,t,n)=>{let r=V(e,`tr`);r.setAttribute(`class`,`f-cwk6it`);let i=V(r,`td`);i.setAttribute(`class`,`f-cwk6it`);let a=V(i,`code`);a.setAttribute(`class`,`code f-cwk6it`),G(a,()=>t.get().code);let o=V(r,`td`);o.setAttribute(`class`,`printer f-cwk6it`),G(o,()=>t.get().printer);let s=V(r,`td`);s.setAttribute(`class`,`f-cwk6it`),G(s,()=>t.get().futu)});let x=V(r,`p`);x.setAttribute(`class`,`note f-cwk6it`),U(x,`No need to memorise them: type state, the editor writes M104.`)}var ke=`/assets/usecases-D3vjd2iO.webp`;Z(`f-5g9l8i`,`.grid.f-5g9l8i {
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
  }`);function Ae(e={},t){let n=V(t,`section`);n.setAttribute(`class`,`section f-5g9l8i`),n.setAttribute(`id`,`use-cases`);let r=V(n,`div`);r.setAttribute(`class`,`wrap f-5g9l8i`);let i=V(r,`p`);i.setAttribute(`class`,`eyebrow f-5g9l8i`),U(i,`Use cases`);let a=V(r,`div`);a.setAttribute(`class`,`head f-5g9l8i`);let o=V(a,`h2`);o.setAttribute(`class`,`title f-5g9l8i`),U(o,`Real jobs. `);let s=V(o,`span`);s.setAttribute(`class`,`f-5g9l8i`),U(s,`Fictional clients.`);let c=V(a,`p`);c.setAttribute(`class`,`intro f-5g9l8i`),U(c,`Six jobs from the Planet Express logbook and how each maps onto Futuscript.`);let l=V(a,`img`);l.setAttribute(`class`,`robot f-5g9l8i`),K(l,`src`,()=>ke),l.setAttribute(`alt`,``);let u=V(r,`div`);u.setAttribute(`class`,`grid f-5g9l8i`),Y(u,()=>Ce,e=>e.id,(e,t,n)=>{let r=V(e,`article`);r.setAttribute(`class`,`f-5g9l8i`);let i=V(r,`p`);i.setAttribute(`class`,`client f-5g9l8i`),G(i,()=>t.get().client);let a=V(r,`h3`);a.setAttribute(`class`,`f-5g9l8i`),G(a,()=>t.get().title);let o=V(r,`p`);o.setAttribute(`class`,`text f-5g9l8i`),G(o,()=>t.get().text),X(r,Q,{get code(){return t.get().code}});let s=V(r,`div`);s.setAttribute(`class`,`meta f-5g9l8i`),Y(s,()=>t.get().tags,e=>e,(e,t,n)=>{let r=V(e,`span`);r.setAttribute(`class`,`chip f-5g9l8i`),G(r,()=>t.get())})})}var je=`M160 332 C132 332 110 312 110 287 C110 266 127 262 127 244 C127 230 120 230 120 215 C120 200 138 192 160 192 C182 192 200 200 200 215 C200 230 193 230 193 244 C193 262 210 266 210 287 C210 312 188 332 160 332 Z M174 228 a14 14 0 1 0 -28 0 a14 14 0 1 0 28 0 Z M154 196 V97 H166 V196 Z M153 99 L148 58 Q160 50 172 58 L167 99 Z M149.5 68 a3.5 3.5 0 1 1 -7 0 a3.5 3.5 0 1 1 7 0 Z M151.5 84 a3.5 3.5 0 1 1 -7 0 a3.5 3.5 0 1 1 7 0 Z M177.5 68 a3.5 3.5 0 1 1 -7 0 a3.5 3.5 0 1 1 7 0 Z M175.5 84 a3.5 3.5 0 1 1 -7 0 a3.5 3.5 0 1 1 7 0 Z`;Z(`f-oif2v4`,`svg.f-oif2v4 {
    display: block;
    width: 100%;
    height: auto;
    margin-bottom: 18px;
  }
  .frame.f-oif2v4 {
    fill: var(--canvas);
    stroke: var(--hairline-strong);
  }
  .rod.f-oif2v4 {
    stroke: var(--hairline-strong);
    stroke-width: 2;
  }
  .bed.f-oif2v4 {
    fill: var(--surface-2);
    stroke: var(--hairline-strong);
  }
  .wire.f-oif2v4 {
    fill: none;
    stroke: var(--cyan);
    stroke-opacity: 0.45;
    stroke-dasharray: 3 3;
  }
  .part.f-oif2v4 {
    fill: url(#layer-lines);
  }
  .pla.f-oif2v4 {
    fill: var(--orange);
  }
  .seam.f-oif2v4 {
    fill: rgb(0 0 0 / 0.28);
  }
  .spaghetti .part.f-oif2v4 {
    filter: url(#melt);
  }
  .gantry.f-oif2v4 {
    fill: var(--surface-2);
    stroke: var(--hairline-strong);
  }
  .carriage.f-oif2v4 {
    fill: var(--fg-2);
  }
  .nozzle.f-oif2v4 {
    fill: var(--yellow);
  }
  .ooze.f-oif2v4 {
    fill: none;
    stroke: var(--orange);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .head.f-oif2v4 {
    animation: printer-sweep 0.45s ease-in-out infinite alternate;
  }
  .cold .head.f-oif2v4 {
    animation-play-state: paused;
  }
  .done .head.f-oif2v4 {
    animation: none;
    transform: translateX(262px);
  }
  @keyframes printer-sweep {
    from { transform: translateX(calc(160px - var(--reach))); }
    to { transform: translateX(calc(160px + var(--reach))); }
  }
  .readout.f-oif2v4 {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
  }
  strong.f-oif2v4 {
    font-weight: 400;
    color: var(--fg);
  }
  input.f-oif2v4 {
    width: 100%;
    margin: 0 0 18px;
    accent-color: var(--orange);
  }
  p.f-oif2v4 {
    font-size: 17px;
    color: var(--cyan);
  }
  .ok.f-oif2v4 {
    color: var(--green);
  }
  .hot.f-oif2v4 {
    color: var(--pink);
  }`);function Me(e={},t){let n=g(210),r=g(0),i=_(()=>n.get()<190?`cold`:n.get()<=240?`ok`:`spaghetti`),a=_(()=>r.get()>=140),o=_(()=>332-r.get()*2),s=_(()=>o.get()<99?18:o.get()<196?6:48);D(()=>{let e=0,t=setInterval(()=>{i.get()!==`cold`&&(r.get()<140?h(r,1,!0):++e>40&&(e=0,r.set(0)))},80);return()=>clearInterval(t)});let c=H(t,`svg`);q(c,()=>[`printer`,i.get(),a.get()&&`done`],`f-oif2v4`),c.setAttribute(`viewBox`,`0 0 320 360`),c.setAttribute(`role`,`img`),K(c,`aria-label`,()=>`3D printer, layer ${r.get()} of 140`);let l=H(c,`defs`);l.setAttribute(`class`,`f-oif2v4`);let u=H(l,`pattern`);u.setAttribute(`class`,`f-oif2v4`),u.setAttribute(`id`,`layer-lines`),u.setAttribute(`width`,`8`),u.setAttribute(`height`,`2`),u.setAttribute(`patternUnits`,`userSpaceOnUse`);let d=H(u,`rect`);d.setAttribute(`class`,`pla f-oif2v4`),d.setAttribute(`width`,`8`),d.setAttribute(`height`,`2`);let f=H(u,`rect`);f.setAttribute(`class`,`seam f-oif2v4`),f.setAttribute(`width`,`8`),f.setAttribute(`height`,`0.5`);let p=H(l,`filter`);p.setAttribute(`class`,`f-oif2v4`),p.setAttribute(`id`,`melt`);let m=H(p,`feTurbulence`);m.setAttribute(`class`,`f-oif2v4`),m.setAttribute(`type`,`fractalNoise`),m.setAttribute(`baseFrequency`,`0.04`),m.setAttribute(`numOctaves`,`2`);let v=H(p,`feDisplacementMap`);v.setAttribute(`class`,`f-oif2v4`),v.setAttribute(`in`,`SourceGraphic`),v.setAttribute(`scale`,`18`);let y=H(l,`clipPath`);y.setAttribute(`class`,`f-oif2v4`),y.setAttribute(`id`,`printed`);let b=H(y,`rect`);b.setAttribute(`class`,`f-oif2v4`),b.setAttribute(`x`,`0`),K(b,`y`,()=>o.get()),b.setAttribute(`width`,`320`),K(b,`height`,()=>332-o.get());let x=H(l,`path`);x.setAttribute(`class`,`f-oif2v4`),x.setAttribute(`id`,`guitar`),K(x,`d`,()=>je);let S=H(c,`rect`);S.setAttribute(`class`,`frame f-oif2v4`),S.setAttribute(`x`,`6`),S.setAttribute(`y`,`6`),S.setAttribute(`width`,`308`),S.setAttribute(`height`,`348`),S.setAttribute(`rx`,`6`);let C=H(c,`line`);C.setAttribute(`class`,`rod f-oif2v4`),C.setAttribute(`x1`,`22`),C.setAttribute(`y1`,`14`),C.setAttribute(`x2`,`22`),C.setAttribute(`y2`,`346`);let w=H(c,`line`);w.setAttribute(`class`,`rod f-oif2v4`),w.setAttribute(`x1`,`298`),w.setAttribute(`y1`,`14`),w.setAttribute(`x2`,`298`),w.setAttribute(`y2`,`346`);let T=H(c,`use`);T.setAttribute(`class`,`wire f-oif2v4`),T.setAttribute(`href`,`#guitar`);let E=H(c,`use`);E.setAttribute(`class`,`part f-oif2v4`),E.setAttribute(`href`,`#guitar`),E.setAttribute(`clip-path`,`url(#printed)`);let O=H(c,`rect`);O.setAttribute(`class`,`bed f-oif2v4`),O.setAttribute(`x`,`60`),O.setAttribute(`y`,`332`),O.setAttribute(`width`,`200`),O.setAttribute(`height`,`7`),O.setAttribute(`rx`,`2`);let k=H(c,`g`);k.setAttribute(`class`,`f-oif2v4`),K(k,`transform`,()=>`translate(0 ${o.get()})`);let A=H(k,`rect`);A.setAttribute(`class`,`gantry f-oif2v4`),A.setAttribute(`x`,`22`),A.setAttribute(`y`,`-28`),A.setAttribute(`width`,`276`),A.setAttribute(`height`,`5`);let j=H(k,`g`);j.setAttribute(`class`,`head f-oif2v4`),oe(j,()=>`--reach: ${s.get()}px`);let M=H(j,`rect`);M.setAttribute(`class`,`carriage f-oif2v4`),M.setAttribute(`x`,`-13`),M.setAttribute(`y`,`-34`),M.setAttribute(`width`,`26`),M.setAttribute(`height`,`20`),M.setAttribute(`rx`,`3`);let N=H(j,`path`);N.setAttribute(`class`,`nozzle f-oif2v4`),N.setAttribute(`d`,`M-5 -14 H5 L0 -1 Z`),J(j,[()=>i.get()===`spaghetti`],[e=>{let t=H(e,`path`);t.setAttribute(`class`,`ooze f-oif2v4`),t.setAttribute(`d`,`M0 -1 c-8 6 8 10 0 16 s-8 10 0 16 s6 8 -2 12`)}]);let P=V(t,`div`);P.setAttribute(`class`,`readout f-oif2v4`);let F=V(P,`span`);F.setAttribute(`class`,`f-oif2v4`),U(F,`Layer `);let I=V(F,`strong`);I.setAttribute(`class`,`f-oif2v4`),G(I,()=>r.get()),U(F,` / `),G(F,()=>140);let L=V(P,`span`);L.setAttribute(`class`,`f-oif2v4`),U(L,`Nozzle `);let R=V(L,`strong`);R.setAttribute(`class`,`f-oif2v4`),G(R,()=>n.get()),U(R,` °C`);let z=V(t,`input`);z.setAttribute(`class`,`f-oif2v4`),z.setAttribute(`type`,`range`),z.setAttribute(`min`,`150`),z.setAttribute(`max`,`280`),le(z,`value`,()=>n.get(),e=>{n.set(e)}),z.setAttribute(`aria-label`,`Nozzle temperature`),J(t,[()=>i.get()===`cold`,()=>i.get()===`spaghetti`,()=>a.get()],[e=>{let t=V(e,`p`);t.setAttribute(`class`,`f-oif2v4`),U(t,`Too cold. The filament won't budge.`)},e=>{let t=V(e,`p`);t.setAttribute(`class`,`hot f-oif2v4`),U(t,`Way too hot. That's no longer a guitar, that's spaghetti.`)},e=>{let t=V(e,`p`);t.setAttribute(`class`,`ok f-oif2v4`),U(t,`Done. Its owner doesn't know yet.`)},e=>{let t=V(e,`p`);t.setAttribute(`class`,`ok f-oif2v4`),U(t,`Just right. Copying a guitar from one photo.`)}])}var Ne=`(<extruderInitialization>)
  import { guitar } from "./guitar.ts"

  const LAYERS = 140

  M104 temp = 210
  M104 layer = 0
  M105 state = temp < 190 ? "cold" : temp <= 240 ? "ok" : "spaghetti"
  M105 done = layer >= LAYERS
  M105 z = 332 - layer * 2
  M105 reach = z < 99 ? 18 : z < 196 ? 6 : 48

  M106 {
    let rest = 0
    const stepper = setInterval(() => {
      if (state === "cold") return
      if (layer < LAYERS) layer++
      else if (++rest > 40) {
        rest = 0
        layer = 0
      }
    }, 80)
    return () => clearInterval(stepper)
  }
(</extruderInitialization>)

(<extrusion>)
  <svg class={["printer", state, done && "done"]} viewBox="0 0 320 360" role="img" aria-label={\`3D printer, layer \${layer} of \${LAYERS}\`}>
    <defs>
      <pattern id="layer-lines" width="8" height="2" patternUnits="userSpaceOnUse">
        <rect class="pla" width="8" height="2" />
        <rect class="seam" width="8" height="0.5" />
      </pattern>
      <filter id="melt">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" />
        <feDisplacementMap in="SourceGraphic" scale="18" />
      </filter>
      <clipPath id="printed">
        <rect x="0" y={z} width="320" height={332 - z} />
      </clipPath>
      <path id="guitar" d={guitar} />
    </defs>

    <rect class="frame" x="6" y="6" width="308" height="348" rx="6" />
    <line class="rod" x1="22" y1="14" x2="22" y2="346" />
    <line class="rod" x1="298" y1="14" x2="298" y2="346" />
    <use class="wire" href="#guitar" />
    <use class="part" href="#guitar" clip-path="url(#printed)" />
    <rect class="bed" x="60" y="332" width="200" height="7" rx="2" />

    <g transform={\`translate(0 \${z})\`}>
      <rect class="gantry" x="22" y="-28" width="276" height="5" />
      <g class="head" style={\`--reach: \${reach}px\`}>
        <rect class="carriage" x="-13" y="-34" width="26" height="20" rx="3" />
        <path class="nozzle" d="M-5 -14 H5 L0 -1 Z" />
        (<if> state === "spaghetti" )
          <path class="ooze" d="M0 -1 c-8 6 8 10 0 16 s-8 10 0 16 s6 8 -2 12" />
        (</if>)
      </g>
    </g>
  </svg>

  <div class="readout">
    <span>Layer <strong>{layer}</strong> / {LAYERS}</span>
    <span>Nozzle <strong>{temp} °C</strong></span>
  </div>
  <input type="range" min="150" max="280" bind:value={temp} aria-label="Nozzle temperature" />

  (<if> state === "cold" )
    <p>Too cold. The filament won't budge.</p>
  (<elseif> state === "spaghetti" )
    <p class="hot">Way too hot. That's no longer a guitar, that's spaghetti.</p>
  (<elseif> done )
    <p class="ok">Done. Its owner doesn't know yet.</p>
  (<else>)
    <p class="ok">Just right. Copying a guitar from one photo.</p>
  (</if>)
(</extrusion>)

(<filament>)
  svg {
    display: block;
    width: 100%;
    height: auto;
    margin-bottom: 18px;
  }
  .frame {
    fill: var(--canvas);
    stroke: var(--hairline-strong);
  }
  .rod {
    stroke: var(--hairline-strong);
    stroke-width: 2;
  }
  .bed {
    fill: var(--surface-2);
    stroke: var(--hairline-strong);
  }
  .wire {
    fill: none;
    stroke: var(--cyan);
    stroke-opacity: 0.45;
    stroke-dasharray: 3 3;
  }
  .part {
    fill: url(#layer-lines);
  }
  .pla {
    fill: var(--orange);
  }
  .seam {
    fill: rgb(0 0 0 / 0.28);
  }
  .spaghetti .part {
    filter: url(#melt);
  }
  .gantry {
    fill: var(--surface-2);
    stroke: var(--hairline-strong);
  }
  .carriage {
    fill: var(--fg-2);
  }
  .nozzle {
    fill: var(--yellow);
  }
  .ooze {
    fill: none;
    stroke: var(--orange);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .head {
    animation: printer-sweep 0.45s ease-in-out infinite alternate;
  }
  .cold .head {
    animation-play-state: paused;
  }
  .done .head {
    animation: none;
    transform: translateX(262px);
  }
  @keyframes printer-sweep {
    from { transform: translateX(calc(160px - var(--reach))); }
    to { transform: translateX(calc(160px + var(--reach))); }
  }
  .readout {
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
    margin: 0 0 18px;
    accent-color: var(--orange);
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
`;Z(`f-3ob6cq`,`.split.f-3ob6cq {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 24px;
  }
  .source.f-3ob6cq {
    min-width: 0;
    contain: size;
    overflow-y: auto;
    border-bottom: 1px solid var(--hairline);
  }
  .live.f-3ob6cq {
    padding: 28px;
    background: var(--surface);
    border: 1px solid var(--hairline);
    box-shadow: inset 0 3px 0 var(--orange);
  }
  .tag.f-3ob6cq {
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
  i.f-3ob6cq {
    width: 6px;
    height: 6px;
    background: var(--orange);
  }
  @media (max-width: 900px) {
    .split.f-3ob6cq {
      grid-template-columns: minmax(0, 1fr);
    }
    .source.f-3ob6cq {
      contain: none;
      max-height: 560px;
    }
  }`);function Pe(e={},t){let n=V(t,`section`);n.setAttribute(`class`,`section f-3ob6cq`),n.setAttribute(`id`,`playground`);let r=V(n,`div`);r.setAttribute(`class`,`wrap f-3ob6cq`);let i=V(r,`p`);i.setAttribute(`class`,`eyebrow f-3ob6cq`),U(i,`Playground`);let a=V(r,`div`);a.setAttribute(`class`,`head f-3ob6cq`);let o=V(a,`h2`);o.setAttribute(`class`,`title f-3ob6cq`),U(o,`This is not a screenshot. `);let s=V(o,`span`);s.setAttribute(`class`,`f-3ob6cq`),U(s,`It's printing right now.`);let c=V(a,`p`);c.setAttribute(`class`,`intro f-3ob6cq`),U(c,`On the left, all of Printer.fs. On the right, that same file running: it's copying a guitar from one photo, a layer at a time. Try overheating it. Printer would.`);let l=V(r,`div`);l.setAttribute(`class`,`split f-3ob6cq`);let u=V(l,`div`);u.setAttribute(`class`,`source f-3ob6cq`),X(u,Q,{get code(){return Ne.trim()},file:`site/src/components/Printer.fs`});let d=V(l,`div`);d.setAttribute(`class`,`live f-3ob6cq`);let f=V(d,`p`);f.setAttribute(`class`,`tag f-3ob6cq`),V(f,`i`).setAttribute(`class`,`f-3ob6cq`),U(f,` Live · guitar.gcode`),X(d,Me,{})}var Fe=`/assets/rendering-DwGeEFFY.webp`;Z(`f-agfr11`,`.split.f-agfr11 {
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
  }`);function Ie(e={},t){let n=g(`spa`),r=_(()=>$.find(e=>e.id===n.get())??$[0]);function i(e){de(()=>{n.set(e)})}let a=V(t,`section`);a.setAttribute(`class`,`section f-agfr11`),a.setAttribute(`id`,`rendering`);let o=V(a,`div`);o.setAttribute(`class`,`wrap f-agfr11`);let s=V(o,`p`);s.setAttribute(`class`,`eyebrow f-agfr11`),U(s,`Rendering`);let c=V(o,`div`);c.setAttribute(`class`,`head f-agfr11`);let l=V(c,`h2`);l.setAttribute(`class`,`title f-agfr11`),U(l,`One pragma per page. `);let u=V(l,`span`);u.setAttribute(`class`,`f-agfr11`),U(u,`Every rendering mode.`);let d=V(c,`p`);d.setAttribute(`class`,`intro f-agfr11`),U(d,`The mode is one line in the setup. Every mode mixes three axes: when HTML is printed, how it's delivered, when JavaScript heats up.`);let f=V(c,`img`);f.setAttribute(`class`,`robot f-agfr11`),K(f,`src`,()=>Fe),f.setAttribute(`alt`,``);let p=V(o,`div`);p.setAttribute(`class`,`split f-agfr11`);let m=V(p,`div`);m.setAttribute(`class`,`tabs f-agfr11`),m.setAttribute(`role`,`tablist`),Y(m,()=>$,e=>e.id,(e,t,r)=>{let a=V(e,`button`);q(a,()=>({active:t.get().id===n.get()}),`f-agfr11`),a.setAttribute(`role`,`tab`),K(a,`aria-selected`,()=>t.get().id===n.get()),ce(a,`click`,()=>(()=>i(t.get().id))),G(a,()=>t.get().label)});let h=V(p,`div`);h.setAttribute(`class`,`panel f-agfr11`),h.setAttribute(`role`,`tabpanel`);let v=V(h,`p`);v.setAttribute(`class`,`mono f-agfr11`),G(v,()=>r.get().label);let y=V(h,`h3`);y.setAttribute(`class`,`f-agfr11`),G(y,()=>r.get().nick),J(h,[()=>r.get().quote],[e=>{let t=V(e,`blockquote`);t.setAttribute(`class`,`f-agfr11`),U(t,`“`),G(t,()=>r.get().quote),U(t,`” `);let n=V(t,`cite`);n.setAttribute(`class`,`f-agfr11`),G(n,()=>r.get().who)}]),U(h,` `);let b=V(h,`p`);b.setAttribute(`class`,`text f-agfr11`),G(b,()=>r.get().text);let x=V(h,`div`);x.setAttribute(`class`,`pragma f-agfr11`),X(x,Q,{get code(){return r.get().pragma}})}var Le=`/assets/errors-BksFjSq9.webp`;Z(`f-gk9bau`,`.split.f-gk9bau {
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
  }`);function Re(e={},t){let n=g(!1),r=_(()=>n.get()?`M14 count = 0`:`M104 count = 0`);function i(){n.set(!n.get())}let a=V(t,`section`);a.setAttribute(`class`,`section f-gk9bau`),a.setAttribute(`id`,`errors`);let o=V(a,`div`);o.setAttribute(`class`,`wrap f-gk9bau`);let s=V(o,`p`);s.setAttribute(`class`,`eyebrow f-gk9bau`),U(s,`Errors`);let c=V(o,`div`);c.setAttribute(`class`,`head f-gk9bau`);let l=V(c,`h2`);l.setAttribute(`class`,`title f-gk9bau`),U(l,`A failed print is spaghetti. `);let u=V(l,`span`);u.setAttribute(`class`,`f-gk9bau`),U(u,`Not a stack trace from Robot Hell.`);let d=V(c,`p`);d.setAttribute(`class`,`intro f-gk9bau`),U(d,`A failed 3D print is a tangle of plastic noodles, hence the name. The joke stops at the title: you get the file, the line and the fix.`);let f=V(c,`img`);f.setAttribute(`class`,`robot f-gk9bau`),K(f,`src`,()=>Le),f.setAttribute(`alt`,``);let p=V(o,`div`);p.setAttribute(`class`,`split f-gk9bau`);let m=V(p,`div`);q(m,()=>[`term`,n.get()&&`broken`],`f-gk9bau`);let h=V(m,`div`);h.setAttribute(`class`,`bar f-gk9bau`);let v=V(h,`span`);v.setAttribute(`class`,`f-gk9bau`),U(v,`futu dev`);let y=V(h,`span`);y.setAttribute(`class`,`state f-gk9bau`),G(y,()=>n.get()?`1 error`:`ok`);let b=V(m,`pre`);b.setAttribute(`class`,`code f-gk9bau`);let x=V(b,`span`);x.setAttribute(`class`,`ln f-gk9bau`),U(x,`2`),U(b,` `),G(b,()=>r.get()),J(m,[()=>n.get()],[e=>{let t=V(e,`pre`);t.setAttribute(`class`,`out err f-gk9bau`),G(t,()=>`Spaghetti in Counter.fs:2:3

 2 │   M14 count = 0
   │   ^^^ unknown G-code

help: did you mean M104 (state)?`)},e=>{let t=V(e,`pre`);t.setAttribute(`class`,`out f-gk9bau`),U(t,`✓ printed in 3 ms · 0 errors · Printer says: neat.`)}]),U(m,` `);let S=V(m,`div`);S.setAttribute(`class`,`actions f-gk9bau`);let C=V(S,`button`);C.setAttribute(`class`,`btn f-gk9bau`),ce(C,`click`,()=>i),G(C,()=>n.get()?`Let Printer fix it`:`Break it`);let w=V(p,`aside`);w.setAttribute(`class`,`f-gk9bau`);let T=V(w,`p`);T.setAttribute(`class`,`mono f-gk9bau`),U(T,`At runtime`);let E=V(w,`h3`);E.setAttribute(`class`,`f-gk9bau`),U(E,`Our crew is replaceable. Your page isn't.`);let D=V(w,`p`);D.setAttribute(`class`,`f-gk9bau`),U(D,`When a component throws, the nearest `);let O=V(D,`code`);O.setAttribute(`class`,`f-gk9bau`),G(O,()=>`(<layer>)`),U(D,` prints its fallback. The rest keeps running.`)}var ze=`/assets/start-D0RX_eB0.webp`;Z(`f-zhmvgs`,`.split.f-zhmvgs {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 48px;
  }
  .stand.f-zhmvgs {
    height: 230px;
    width: auto;
    margin-bottom: -6px;
    pointer-events: none;
    user-select: none;
    filter: drop-shadow(0 14px 18px rgb(0 0 0 / 0.5));
  }
  @media (max-width: 760px) {
    .split.f-zhmvgs {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
    .stand.f-zhmvgs {
      justify-self: end;
      height: 160px;
    }
  }`);function Be(e={},t){let n=V(t,`section`);n.setAttribute(`class`,`section f-zhmvgs`),n.setAttribute(`id`,`start`);let r=V(n,`div`);r.setAttribute(`class`,`wrap f-zhmvgs`);let i=V(r,`p`);i.setAttribute(`class`,`eyebrow f-zhmvgs`),U(i,`Get started`);let a=V(r,`div`);a.setAttribute(`class`,`head f-zhmvgs`);let o=V(a,`h2`);o.setAttribute(`class`,`title f-zhmvgs`),U(o,`Shut up and take my money!`);let s=V(a,`p`);s.setAttribute(`class`,`intro f-zhmvgs`),U(s,`The compiler, signals and client rendering work today, and this site runs on them. Server rendering is next.`);let c=V(r,`div`);c.setAttribute(`class`,`split f-zhmvgs`),X(c,Q,{get code(){return`# needs Node 24+, pnpm and stable Rust
pnpm install
pnpm dev     # builds the Slicer, opens the playground
pnpm test    # compiler tests in Rust + vitest end to end

# or run the compiler by itself
cargo run -q -- examples/Counter.fs`},file:`terminal`,lang:`sh`});let l=V(c,`img`);l.setAttribute(`class`,`stand f-zhmvgs`),K(l,`src`,()=>ze),l.setAttribute(`alt`,``)}var Ve=`/assets/footer-C1KQUZgD.webp`;Z(`f-hh564c`,`footer.f-hh564c {
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
  }`);function He(e={},t){let n=V(t,`footer`);n.setAttribute(`class`,`f-hh564c`);let r=V(n,`div`);r.setAttribute(`class`,`inner f-hh564c`);let i=V(r,`div`);i.setAttribute(`class`,`brand f-hh564c`);let a=V(i,`p`);a.setAttribute(`class`,`word f-hh564c`);let o=V(a,`img`);o.setAttribute(`class`,`f-hh564c`),o.setAttribute(`src`,`/rocket.svg`),o.setAttribute(`alt`,``),U(a,`Futu`);let s=V(a,`b`);s.setAttribute(`class`,`f-hh564c`),U(s,`script`);let c=V(i,`p`);c.setAttribute(`class`,`f-hh564c`),U(c,`Every section of this page is a .fs file. Printer slept through the build.`);let l=V(r,`div`);l.setAttribute(`class`,`links f-hh564c`);let u=V(l,`a`);u.setAttribute(`class`,`f-hh564c`),u.setAttribute(`href`,`#why`),U(u,`Why`);let d=V(l,`a`);d.setAttribute(`class`,`f-hh564c`),d.setAttribute(`href`,`#syntax`),U(d,`Syntax`);let f=V(l,`a`);f.setAttribute(`class`,`f-hh564c`),f.setAttribute(`href`,`#use-cases`),U(f,`Use cases`);let p=V(l,`a`);p.setAttribute(`class`,`f-hh564c`),p.setAttribute(`href`,`#playground`),U(p,`Playground`);let m=V(l,`a`);m.setAttribute(`class`,`f-hh564c`),m.setAttribute(`href`,`#rendering`),U(m,`Rendering`);let h=V(l,`a`);h.setAttribute(`class`,`f-hh564c`),h.setAttribute(`href`,`#start`),U(h,`Get started`);let g=V(r,`img`);g.setAttribute(`class`,`sleeper f-hh564c`),K(g,`src`,()=>Ve),g.setAttribute(`alt`,``);let _=V(n,`div`);_.setAttribute(`class`,`base f-hh564c`);let v=V(_,`span`);v.setAttribute(`class`,`f-hh564c`),U(v,`Printed in New New York, year 3000`);let y=V(_,`span`);y.setAttribute(`class`,`f-hh564c`),U(y,`A fan-made joke framework. Futurama belongs to its creators, we just borrowed the printer.`)}function Ue(e={},t){let n=V(t,`main`);X(n,pe,{}),X(n,we,{}),X(n,Ee,{}),X(n,Oe,{}),X(n,Ae,{}),X(n,Pe,{}),X(n,Ie,{}),X(n,Re,{}),X(n,Be,{}),X(n,He,{})}fe(Ue,document.getElementById(`plate`));