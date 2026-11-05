(<extruderInitialization>)
  import robot from "../assets/robots/syntax.webp"
  import { blocks, codes } from "../content.ts"
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="syntax">
    <div class="wrap">
      <p class="eyebrow">Syntax</p>
      <div class="head">
        <h2 class="title">Four blocks and a few printer codes. <span>That's the whole language.</span></h2>
        <p class="intro">Every block is optional. The codes do roughly what they do on a real printer: the M10x temperature family is the reactivity family.</p>
        <img class="robot" src={robot} alt="" />
      </div>

      <h3 class="sub">Anatomy of a .fs file</h3>
      <ul class="blocks">
        (<each> b of blocks by b.name )
          <li>
            <code>{b.name}</code>
            <div class="what"><strong>{b.what}</strong><span>Runs {b.runs}.</span></div>
          </li>
        (</each>)
      </ul>

      <h3 class="sub">G-code cheat sheet</h3>
      <div class="table">
        <table>
          <thead>
            <tr><th>Code</th><th>On a real printer</th><th>In Futuscript</th></tr>
          </thead>
          <tbody>
            (<each> c of codes by c.code )
              <tr>
                <td><code class="code">{c.code}</code></td>
                <td class="printer">{c.printer}</td>
                <td>{c.futu}</td>
              </tr>
            (</each>)
          </tbody>
        </table>
      </div>
      <p class="note">No need to memorise them: type state, the editor writes M104.</p>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .sub {
    margin: 0 0 18px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .blocks {
    margin: 0 0 72px;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--hairline);
  }
  .blocks li {
    display: grid;
    grid-template-columns: minmax(0, 330px) 1fr;
    align-items: center;
    gap: 24px;
    padding: 18px 0;
    border-bottom: 1px solid var(--hairline);
  }
  .blocks code {
    font-size: 14px;
    color: var(--green);
    overflow-wrap: anywhere;
  }
  .what {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .what strong {
    font-weight: 500;
  }
  .what span {
    font-size: 14px;
    color: var(--muted);
  }
  .table {
    overflow-x: auto;
    border: 1px solid var(--hairline);
  }
  table {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
    font-size: 14px;
  }
  th {
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
  td {
    padding: 12px 16px;
    vertical-align: middle;
    border-bottom: 1px solid var(--hairline);
  }
  tbody tr:last-child td {
    border-bottom: 0;
  }
  tbody tr:hover td {
    background: var(--tint, rgb(255 255 255 / 0.025));
  }
  .code {
    font-size: 14px;
    font-weight: 700;
    color: var(--orange);
  }
  .printer {
    color: var(--muted);
  }
  .note {
    margin-top: 20px;
    max-width: 620px;
    font-size: 15px;
    color: var(--muted);
  }
  @media (max-width: 760px) {
    .blocks li {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }
    .blocks .chip {
      justify-self: start;
    }
  }
(</filament>)
